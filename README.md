# SubjTitute

A teacher-substitution matching prototype for Senior High School. The app starts with no stored data so you can enter your school's teachers, absences, and subject information before running the matcher.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start by adding your own
teachers from the Teachers page and by reporting absences from the Absences
view. The matcher works from the data you enter in the browser and does not
include any built-in sample records. Use **Report absence** to add a class
request, **Run matching** to calculate assignments, and **Confirm** to review
a recommendation. The absence form accepts a first and last day and the
weekday of the recurring class period. Add teachers from the Teachers page;
use **Edit** in the teacher directory to update details, preferences, or any
number of regular timetable periods. Edits refresh open match recommendations.
In Match results, select **Use** on a ranked alternative before confirming;
alternatives are blocked if they would conflict with an assignment or workload
limit. Teacher and request changes are held in browser memory for this
prototype and reset when the page is refreshed. Teacher search and CSV export
are also available there.

The app opens with a demo administrator login (`admin` / `adminaccess`). This
client-side login is only a UI gate for the prototype; it is not production
authentication and does not protect data from access.

## Validate

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Matching model

The pure TypeScript matching engine lives in `src/lib/matching/` and follows
the supplied Python reference:

1. Filter candidates using availability, schedule, subject expertise, notice,
   budget, and current substitute load.
2. Score each eligible teacher for a class using min-max normalized workload,
   notice, and cost, plus expertise and subject preference.
3. Score each class for a teacher using subject preference, grade, period,
   subject fit, and honorarium.
4. Run class-proposing deferred acceptance. Teacher capacity and schedule
   overlap are checked when keeping proposals; rejected classes propose again.
5. Return assignments, unfilled classes, class rankings, and the selected
   teacher's per-criterion score breakdown.

The displayed weights are example defaults, not survey findings. The app is a
prototype and should not be used as a production scheduling or payroll system.
