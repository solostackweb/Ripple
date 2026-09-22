export type ImportSource = {
  name: string;
  kind: "manual" | "file" | "gmail" | "google_drive" | "google_calendar";
  mimeType: string;
  content: string;
};

export const astraEvent = {
  name: "Astra OpenAI Conference 2026",
  startsAt: "2026-09-23T09:00:00+05:30",
  endsAt: "2026-09-23T18:00:00+05:30",
  location: "OpenAI Lab & Innovation Hall, Campus",
  attendeeCount: 500,
};

export const astraSources: ImportSource[] = [
  {
    name: "01-event-brief.md",
    kind: "file",
    mimeType: "text/markdown",
    content: `# Astra OpenAI Conference 2026
Date: 23 September 2026
Public hours: 9:00 AM–6:00 PM
Registration: 8:30 AM
Campus: OpenAI Lab complex
Expected attendance: 500
Event lead: Akshat
Operations lead: Maya Sharma
Production lead: Arjun Mehta

Purpose: a one-day college conference about building useful, safe agentic AI products. The day combines an opening keynote, product demonstrations, technical workshops, an agent safety panel, and a closing showcase.`,
  },
  {
    name: "02-agenda.csv",
    kind: "file",
    mimeType: "text/csv",
    content: `start,end,session,room,owner,capacity
08:30,09:00,Registration,OpenAI Lab Lobby,Maya Sharma,500
09:00,09:20,Welcome and opening,Main Auditorium,Akshat,500
09:30,10:15,Opening keynote: Agents that act,Main Auditorium,Dr. Rhea Kapoor,500
10:15,10:45,Coffee and demos,Auditorium Foyer,Rhea Singh,500
10:45,12:00,Workshop: Build your first agent,Lab A,Arjun Mehta,120
10:45,12:00,Workshop: Reliable tool use,Lab B,Naina Rao,100
12:00,13:00,Lunch,Central Courtyard,Rhea Singh,500
13:00,14:00,Student product showcase,Innovation Hall,Akshat,380
14:00,15:00,Panel: Safety for useful agents,Innovation Hall,Naina Rao,380
15:15,16:30,Agentic workflows lab,Lab A,Arjun Mehta,120
16:45,17:30,Closing showcase,Main Auditorium,Akshat,500
17:30,18:00,Networking,Auditorium Foyer,Maya Sharma,500`,
  },
  {
    name: "03-speakers.csv",
    kind: "file",
    mimeType: "text/csv",
    content: `name,role,session,status,arrival,contact_owner
Dr. Rhea Kapoor,AI researcher,Opening keynote: Agents that act,confirmed,08:30,Maya Sharma
Naina Rao,AI safety engineer,Panel: Safety for useful agents,confirmed,12:30,Akshat
Prof. Kabir Sen,Faculty lead,Panel: Safety for useful agents,confirmed,13:15,Akshat
Ishita Bose,Founder,Panel: Safety for useful agents,confirmed,13:15,Maya Sharma
Arjun Mehta,Developer advocate,Workshop: Build your first agent,confirmed,09:45,Akshat`,
  },
  {
    name: "04-venue-and-production.md",
    kind: "file",
    mimeType: "text/markdown",
    content: `# Venue facts
Main Auditorium: 520 seated, fixed stage, confidence monitor, four wireless microphones, streaming encoder, hearing loop.
Innovation Hall: 380 seated, modular stage, two wireless microphones, portable projector, no fixed streaming encoder.
Lab A: 120 workstations. Lab B: 100 workstations. Central Courtyard: catering capacity 550.

# Production assignments
The streaming encoder, confidence monitor and four wireless microphones are booked in Main Auditorium from 8:00 AM to 6:00 PM. Opening and closing slides name Main Auditorium. Eight printed signs direct keynote attendees to Main Auditorium. Recording consent is confirmed for all published speakers.`,
  },
  {
    name: "05-operations.csv",
    kind: "file",
    mimeType: "text/csv",
    content: `task,owner,due,status,depends_on
Confirm campus security access,Maya Sharma,2026-09-22 17:00,done,Venue contract
Print eight wayfinding signs,Maya Sharma,2026-09-22 19:00,in_progress,Final room plan
Test keynote live stream,Arjun Mehta,2026-09-23 08:00,todo,Streaming encoder
Brief registration volunteers,Akshat,2026-09-22 20:00,todo,Registration schedule
Confirm overflow room,Akshat,2026-09-22 18:00,todo,Attendee count
Approve attendee welcome email,Akshat,2026-09-22 21:00,todo,Final agenda
Confirm coffee service route,Rhea Singh,2026-09-22 18:30,in_progress,Room plan`,
  },
  {
    name: "06-communications.md",
    kind: "file",
    mimeType: "text/markdown",
    content: `# Welcome email draft
Subject: Everything you need for Astra tomorrow
Doors open for registration at 8:30 AM in the OpenAI Lab Lobby. The opening keynote begins at 9:30 AM in Main Auditorium. Bring your college ID and laptop for workshops. Lunch and coffee are included.

# Calendar facts
The attendee calendar event runs 9:00 AM–6:00 PM and lists Main Auditorium as the primary location. Speaker calendar holds include their arrival time, green-room location and session room.`,
  },
  {
    name: "07-change-inbox.md",
    kind: "gmail",
    mimeType: "message/rfc822",
    content: `From: Priya Mehta, Campus Facilities
Time: 22 September 2026, 9:14 AM
Subject: Urgent room reassignment for Astra keynote

Due to a maintenance inspection, the Astra opening keynote must move from Main Auditorium to Innovation Hall. Innovation Hall is available from 8:00 AM, but its seated capacity is 380. Please update production, wayfinding, catering and attendee communication plans. The closing showcase can remain in Main Auditorium.`,
  },
];

export const astraEntities = [
  { key: "event-astra", kind: "event", name: "Astra 2026", attributes: { date: "2026-09-23", attendees: 500 } },
  { key: "session-keynote", kind: "session", name: "Opening keynote", attributes: { startsAt: "09:30", duration: 45 } },
  { key: "venue-main", kind: "venue", name: "Main Auditorium", attributes: { capacity: 520 } },
  { key: "venue-innovation", kind: "venue", name: "Innovation Hall", attributes: { capacity: 380 } },
  { key: "speaker-rhea", kind: "person", name: "Dr. Rhea Kapoor", attributes: { role: "Keynote speaker" } },
  { key: "audience", kind: "audience", name: "500 registered attendees", attributes: { count: 500 } },
  { key: "production-av", kind: "vendor", name: "Keynote AV production", attributes: { encoder: "Main Auditorium" } },
  { key: "document-signage", kind: "document", name: "Wayfinding signage brief", attributes: { version: 4 } },
  { key: "message-facilities", kind: "source", name: "Facilities room update", attributes: { receivedAt: "2026-09-22T09:14:00+05:30" } },
  { key: "task-overflow", kind: "task", name: "Confirm overflow room", attributes: { status: "todo" } },
];

export const astraRelationships = [
  ["event-astra", "session-keynote", "includes"],
  ["session-keynote", "venue-main", "scheduled_at"],
  ["session-keynote", "venue-innovation", "moved_to"],
  ["speaker-rhea", "session-keynote", "speaks_at"],
  ["audience", "session-keynote", "attends"],
  ["production-av", "session-keynote", "supports"],
  ["document-signage", "venue-main", "directs_to"],
  ["message-facilities", "session-keynote", "changes"],
  ["venue-innovation", "task-overflow", "creates_risk"],
  ["audience", "task-overflow", "requires"],
] as const;

