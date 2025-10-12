from django.urls import path
from .views import inflation_stub

urlpatterns = [
    path('inflation', inflation_stub, name = "inflation"),
]