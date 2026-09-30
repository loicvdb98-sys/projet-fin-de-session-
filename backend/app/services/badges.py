"""Badges et séries de régularité, calculés à partir des données de l'utilisateur (présences,
objectifs, records, journal). Fonctions pures : la route se charge de lire la base."""

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Badge:
    code: str
    title: str
    description: str
    target: int
    progress: int
    earned_at: date | None = None

    @property
    def earned(self) -> bool:
        return self.progress >= self.target


def _monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_streaks(presence_days: list[date], today: date) -> tuple[int, int, date | None]:
    """Semaines consécutives (lundi → dimanche) avec au moins une présence : série en cours,
    meilleure série, et lundi de la semaine où une série a atteint 4 semaines pour la première
    fois (ou None). La série en cours reste valable tant que la semaine précédente compte une
    présence : elle n'est pas perdue parce que la semaine actuelle vient de commencer."""
    weeks = sorted({_monday(day) for day in presence_days})
    best = run = 0
    fourth_week: date | None = None
    for index, monday in enumerate(weeks):
        run = run + 1 if index and monday - weeks[index - 1] == timedelta(weeks=1) else 1
        best = max(best, run)
        if run == 4 and fourth_week is None:
            fourth_week = monday
    current = run if weeks and weeks[-1] >= _monday(today) - timedelta(weeks=1) else 0
    return current, best, fourth_week


def _nth(days: list[date], count: int) -> date | None:
    """Date à laquelle le count-ième élément a été atteint (liste triée), ou None."""
    return days[count - 1] if len(days) >= count else None


def compute_badges(
    past_statuses: list[tuple[date, str]],
    goals_completed: int,
    record_days: list[date],
    journal_days: list[date],
    today: date,
) -> tuple[list[Badge], int, int]:
    """Calcule les badges et les séries. `past_statuses` : (jour, statut) des séances passées
    de l'utilisateur, triées de la plus ancienne à la plus récente."""
    presence_days = [day for day, status in past_statuses if status == "present"]
    current, best, fourth_week = weekly_streaks(presence_days, today)
    # Présences d'affilée en partant de la séance passée la plus récente.
    in_a_row = 0
    for _, status in reversed(past_statuses):
        if status != "present":
            break
        in_a_row += 1
    records, journal = sorted(record_days), sorted(journal_days)
    badges = [
        Badge("premiere-seance", "Premier pas", "Participer à une première séance.", 1, len(presence_days), _nth(presence_days, 1)),
        Badge("habitue", "Habitué", "Être présent à 10 séances.", 10, len(presence_days), _nth(presence_days, 10)),
        Badge("pilier", "Pilier", "Être présent à 25 séances.", 25, len(presence_days), _nth(presence_days, 25)),
        Badge("regularite", "Régularité", "S'entraîner 4 semaines d'affilée.", 4, best, fourth_week),
        Badge("sans-faute", "Sans faute", "Être présent à 5 séances de suite, sans absence.", 5, in_a_row),
        Badge("objectif", "Objectif atteint", "Atteindre un de ses objectifs.", 1, goals_completed),
        Badge("record", "Record personnel", "Enregistrer un record personnel.", 1, len(records), _nth(records, 1)),
        Badge("carnet", "Carnet de bord", "Remplir 5 bilans dans le journal d'entraînement.", 5, len(journal), _nth(journal, 5)),
    ]
    return badges, current, best
