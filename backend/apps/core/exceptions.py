import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Http404):
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if isinstance(exc, PermissionDenied):
        return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    if isinstance(exc, ValidationError):
        return Response({"detail": exc.message_dict if hasattr(exc, "message_dict") else str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if response is not None:
        # Strip internal details from 500-class errors
        if response.status_code >= 500:
            logger.error("Server error: %s", exc, exc_info=True)
            return Response({"detail": "An internal server error occurred."}, status=response.status_code)
        return response

    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return Response({"detail": "An internal server error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
