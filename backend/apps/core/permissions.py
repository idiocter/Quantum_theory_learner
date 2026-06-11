from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAdminUser(BasePermission):
    """Allows access only to users with is_staff=True."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow if request.user owns the object or is admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        owner = getattr(obj, "user", getattr(obj, "owner", None))
        return owner == request.user


class IsAuthenticatedOrReadOnly(BasePermission):
    """Safe methods are open; write methods require authentication."""

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated)
