from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Hello world test for command discovery"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("scrape_walmart command is wired up"))
