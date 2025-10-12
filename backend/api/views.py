from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
def inflation_stub(request):
    return JsonResponse({
        "region": request.GET.get("region", "atlanta"),
        "window": request.GET.get("window", "12m"),
        "series": [],
        "note": "This is a stub response"

    })