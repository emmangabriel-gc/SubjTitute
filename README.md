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
a recommendation. When reporting absences, choose an existing teacher from
the searchable teacher list and add each absent class date separately; the
weekday is detected automatically and each date can have its own class times.
Add teachers from the Teachers page; enter each teacher's level/qualification.
All teacher accounts, existing and new, use the shared login password
`teacher`. Use **Edit** in the teacher directory to update details,
preferences, or any number of regular timetable periods. In the teacher form,
select **Import CSV** to replace a teacher's regular busy periods from a
spreadsheet file. The CSV requires `day`, `start`, and `end` columns; weekday
names or abbreviations and 12-hour or 24-hour times are accepted. Use
**Download template** in the form for an example file. Imported rows are
validated for invalid times and overlapping periods before they are applied.
Qualifications are recorded for display and export; they do not affect matching
scores. Edits refresh open match recommendations.
In Match results, select **Use** on a ranked alternative before confirming;
alternatives are blocked if they would conflict with an assignment or workload
limit. Teacher and request changes are held in browser memory for this
prototype and reset when the page is refreshed. Teacher search and CSV export
are also available there.

The app opens with a demo administrator login (`admin` / `adminaccess`). After a
successful sign-in, the app displays a logo-writing loading animation. Teachers
can choose **Teacher** on the sign-in screen and use the ID generated when their
account was created and the shared password `teacher`. The teacher
portal shows their reported absences and coverage progress. It does not reveal
a recommended substitute's name until an administrator confirms the match.
Teachers can file leave applications by listing each affected class session.
Administrators review pending applications from the Absences page; approval
adds each session as a class request and runs matching, while substitute
assignments still require the administrator's separate confirmation. Teachers
can see whether each application is pending, approved, or declined.
This client-side login is only a UI gate for the prototype; teacher passwords,
teacher records, and requests stay in browser memory and reset on refresh. This
is not production authentication and does not protect data from access.
The interface uses the supplied SubjTitute logo and color palette. Use the
theme control on the sign-in screen or in Settings to switch between light and
dark mode; the selection is saved in this browser.

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
