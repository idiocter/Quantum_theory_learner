import logging

import anthropic
from celery import shared_task
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

SYSTEM_PROMPTS = {
    "beginner": (
        "You are a friendly quantum physics tutor for absolute beginners. "
        "Use simple analogies, avoid heavy mathematics, and build intuition step by step. "
        "When you must use math, write equations in LaTeX syntax wrapped in $...$ for inline "
        "or $$...$$ for display. Keep responses concise (150-250 words) and encouraging."
    ),
    "intermediate": (
        "You are a quantum physics tutor for students with undergraduate-level physics background. "
        "You can use standard quantum mechanics notation, bra-ket formalism, and derive results. "
        "Write all equations in LaTeX (inline $...$ or display $$...$$). "
        "Be precise, pedagogical, and connect concepts to physical intuition. "
        "Aim for 200-350 words per response."
    ),
    "advanced": (
        "You are an expert quantum physics tutor for graduate-level students. "
        "You may use advanced formalism: second quantization, path integrals, density matrices, "
        "Hilbert space operators, and perturbation theory. "
        "Write all equations in LaTeX (inline $...$ or display $$...$$). "
        "Be rigorous, cite relevant theorems, and highlight subtleties. "
        "Responses may be up to 500 words."
    ),
}

CONCEPT_CONTEXT_TEMPLATE = (
    "\n\nContext: The student is currently studying the concept '{title}'.\n"
    "Concept summary: {description}"
)


def _build_messages(conversation):
    """Convert stored messages to Anthropic message format."""
    return [
        {"role": msg.role, "content": msg.content}
        for msg in conversation.messages.filter(status="completed").order_by("created_at")
    ]


@shared_task(
    bind=True,
    queue="ai_tasks",
    max_retries=2,
    default_retry_delay=5,
    name="ai_tutor.generate_response",
)
def generate_ai_response(self, conversation_id: str, assistant_message_id: str) -> None:
    from apps.ai_tutor.models import Conversation, Message

    try:
        conversation = Conversation.objects.select_related("concept", "user").get(id=conversation_id)
        assistant_msg = Message.objects.get(id=assistant_message_id)
    except (Conversation.DoesNotExist, Message.DoesNotExist) as exc:
        logger.error("generate_ai_response: record not found — %s", exc)
        return

    difficulty = conversation.difficulty or "intermediate"
    system_prompt = SYSTEM_PROMPTS.get(difficulty, SYSTEM_PROMPTS["intermediate"])

    if conversation.concept:
        system_prompt += CONCEPT_CONTEXT_TEMPLATE.format(
            title=conversation.concept.title,
            description=conversation.concept.description or "",
        )

    # Build message history excluding the pending assistant placeholder
    anthropic_messages = _build_messages(conversation)

    model = getattr(settings, "ANTHROPIC_MODEL", "claude-opus-4-8")
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        with client.messages.stream(
            model=model,
            max_tokens=1024,
            system=system_prompt,
            messages=anthropic_messages,
            thinking={"type": "adaptive"},
        ) as stream:
            final = stream.get_final_message()

        # Extract text content blocks only
        response_text = "".join(
            block.text for block in final.content if block.type == "text"
        )
        input_tokens = final.usage.input_tokens
        output_tokens = final.usage.output_tokens

        from django.db.models import F

        with transaction.atomic():
            assistant_msg.content = response_text
            assistant_msg.status = Message.Status.COMPLETED
            assistant_msg.input_tokens = input_tokens
            assistant_msg.output_tokens = output_tokens
            assistant_msg.save(update_fields=["content", "status", "input_tokens", "output_tokens"])

            Conversation.objects.filter(id=conversation_id).update(
                total_tokens_used=F("total_tokens_used") + input_tokens + output_tokens
            )

        # Auto-title conversation from first user message
        conversation.auto_title_from_first_message()

        logger.info("AI response generated: conv=%s tokens=%d+%d", conversation_id, input_tokens, output_tokens)

    except anthropic.APIStatusError as exc:
        logger.error("Anthropic API error for conv %s: %s", conversation_id, exc)
        assistant_msg.content = "I encountered an error generating a response. Please try again."
        assistant_msg.status = Message.Status.ERROR
        assistant_msg.save(update_fields=["content", "status"])

    except Exception as exc:
        logger.exception("Unexpected error in generate_ai_response for conv %s", conversation_id)
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            assistant_msg.content = "I'm temporarily unavailable. Please try again shortly."
            assistant_msg.status = Message.Status.ERROR
            assistant_msg.save(update_fields=["content", "status"])