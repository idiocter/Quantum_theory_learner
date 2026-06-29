"""Keep each Concept's stored full-text `search_vector` current.

The vector is rebuilt whenever a Concept is saved, or when one of its content
rows changes (since the explanation text is folded into the vector). `update()`
inside `update_search_vector` does not re-fire `post_save`, so there's no
recursion.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Concept, ConceptContent


@receiver(post_save, sender=Concept)
def _concept_saved(sender, instance, **kwargs):
    instance.update_search_vector()


@receiver(post_save, sender=ConceptContent)
def _content_saved(sender, instance, **kwargs):
    instance.concept.update_search_vector()
