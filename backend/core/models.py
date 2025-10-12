from django.db import models

# Create your models here.
class Item(models.Model):
    name = models.CharField(max_length = 120)
    brand = models.CharField(max_length = 80, blank = True)
    upc = models.CharField(max_length = 32, blank = True)
    store_item_id = models.CharField(max_length = 64, blank = True)
    unit = models.CharField(max_length = 24, help_text = "e.g., lb, gal, oz")
    category = models.CharField(max_length = 64)
    unit_size_std = models.FloatField(help_text = "standard size in base unit specified")

    def __str__(self):
        return self.name

class Price(models.Model):
    item = models.ForeignKey(Item, on_delete = models.CASCADE)
    store = models.CharField(max_length = 64)
    zip = models.CharField(max_length = 10)
    date = models.DateField()
    price = models.DecimalField(max_digits = 8, decimal_places = 2)
    unit_size_observed = models.FloatField()
    url = models.URLField(max_length = 512, blank = True)
    status = models.CharField(max_length = 24, default = "ok")

    class Meta:
        indexes = [
            models.Index(fields = ["item", "date"]),
            models.Index(fields = ["zip", "date"]),
        ]

class Index(models.Model):
    source = models.CharField(max_length = 32)
    series_id = models.CharField(max_length = 64)
    region = models.CharField(max_length = 64)
    date = models.DateField()
    value = models.FloatField()

    class Meta:
        indexes = [models.Index(fields = ["series_id", "date"])]

class Metric(models.Model):
    region = models.CharField(max_length = 64)
    date = models.DateField()
    basket_cost = models.DecimalField(max_digits = 9, decimal_places = 2, null = True, blank = True)
    mom = models.FloatField(null = True, blank = True)
    yoy = models.FloatField(null = True, blank = True)
    nowcast = models.FloatField(null = True, blank = True)
    notes = models.TextField(blank = True)

    class Meta:
        indexes = [models.Index(fields = ["region", "date"])]