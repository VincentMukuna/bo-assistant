export type ApprovalState = "pending" | "approved" | "edited" | "taken-over";
export type ActivityFilter = "all" | "approval" | "completed";

export type Conversation = {
  id: string;
  customerId: string;
  name: string;
  initials: string;
  channel: string;
  preview: string;
  time: string;
  unread?: boolean;
  label: string;
};

export type Message = {
  id: string;
  kind: "customer" | "staff" | "assistant";
  text: string;
  time: string;
};

export type Booking = {
  id: string;
  customerId: string;
  customer: string;
  service: string;
  staff: string;
  day: string;
  date: string;
  time: string;
  duration: string;
  status: "Confirmed" | "Needs approval" | "In progress" | "Completed";
  address: string;
};

export type Customer = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  address: string;
  since: string;
  note: string;
};

export type AgentTask = {
  id: string;
  title: string;
  customer: string;
  time: string;
  status: "Completed" | "Approval needed" | "In progress";
  checked: string[];
  outcome: string;
};

export const conversations: Conversation[] = [
  {
    id: "alice",
    customerId: "c1",
    name: "Alice Morgan",
    initials: "AM",
    channel: "SMS",
    preview: "Tuesday afternoon would be perfect.",
    time: "4m",
    unread: true,
    label: "Reschedule",
  },
  {
    id: "marcus",
    customerId: "c2",
    name: "Marcus Lee",
    initials: "ML",
    channel: "Web",
    preview: "Is the call-out fee included?",
    time: "18m",
    unread: true,
    label: "Pricing",
  },
  {
    id: "sophie",
    customerId: "c3",
    name: "Sophie Bennett",
    initials: "SB",
    channel: "SMS",
    preview: "Thank you, see you tomorrow!",
    time: "42m",
    label: "Booked",
  },
  {
    id: "daniel",
    customerId: "c4",
    name: "Daniel Okafor",
    initials: "DO",
    channel: "Email",
    preview: "A photo of the damaged hinge is attached.",
    time: "1h",
    label: "New request",
  },
  {
    id: "maya",
    customerId: "c5",
    name: "Maya Patel",
    initials: "MP",
    channel: "SMS",
    preview: "Could we add the oven clean as well?",
    time: "2h",
    label: "Change",
  },
];

export const initialMessages: Record<string, Message[]> = {
  alice: [
    {
      id: "a1",
      kind: "customer",
      text: "Hi, I need to move my deep clean this Thursday. Do you have anything early next week?",
      time: "9:42 AM",
    },
    {
      id: "a2",
      kind: "assistant",
      text: "Found Alice’s upcoming deep clean and checked the rescheduling policy.",
      time: "9:43 AM",
    },
    {
      id: "a3",
      kind: "staff",
      text: "We can help with that. Would Monday morning or Tuesday afternoon work better?",
      time: "9:44 AM",
    },
    {
      id: "a4",
      kind: "customer",
      text: "Tuesday afternoon would be perfect.",
      time: "9:48 AM",
    },
    {
      id: "a5",
      kind: "assistant",
      text: "Checked Jamie and Rosa’s availability. Tuesday at 2:30 PM is open and keeps the same cleaning team.",
      time: "9:48 AM",
    },
  ],
  marcus: [
    {
      id: "m1",
      kind: "customer",
      text: "Hi, I have a leaking kitchen tap. Is the call-out fee included in the repair price?",
      time: "9:27 AM",
    },
    {
      id: "m2",
      kind: "assistant",
      text: "Reviewed the plumbing price guide and the call-out policy for Marcus’s area.",
      time: "9:28 AM",
    },
  ],
  sophie: [
    {
      id: "s1",
      kind: "staff",
      text: "You’re confirmed for tomorrow at 10:00 AM. Noah will text when he’s on the way.",
      time: "9:04 AM",
    },
    {
      id: "s2",
      kind: "customer",
      text: "Thank you, see you tomorrow!",
      time: "9:06 AM",
    },
    {
      id: "s3",
      kind: "assistant",
      text: "Confirmation recorded. No further action is needed.",
      time: "9:06 AM",
    },
  ],
  daniel: [
    {
      id: "d1",
      kind: "customer",
      text: "Our back door hinge has split. A photo of the damaged hinge is attached.",
      time: "8:31 AM",
    },
    {
      id: "d2",
      kind: "assistant",
      text: "Identified this as a likely hinge replacement and is checking repair availability.",
      time: "8:32 AM",
    },
  ],
  maya: [
    {
      id: "p1",
      kind: "customer",
      text: "Could we add the oven clean to Friday’s standard clean as well?",
      time: "7:54 AM",
    },
    {
      id: "p2",
      kind: "assistant",
      text: "Checked the service duration and Friday’s route. The add-on fits without moving the arrival window.",
      time: "7:55 AM",
    },
  ],
};

export const customers: Customer[] = [
  {
    id: "c1",
    name: "Alice Morgan",
    initials: "AM",
    phone: "+1 (415) 555-0192",
    email: "alice.morgan@example.com",
    address: "1842 Pine Street, San Francisco",
    since: "Customer since March 2024",
    note: "Prefers the same cleaning team. Side gate code is 2814. Has a small, friendly dog.",
  },
  {
    id: "c2",
    name: "Marcus Lee",
    initials: "ML",
    phone: "+1 (415) 555-0138",
    email: "marcus.lee@example.com",
    address: "731 20th Avenue, San Francisco",
    since: "Customer since June 2026",
    note: "Please call on arrival; the front buzzer is unreliable.",
  },
  {
    id: "c3",
    name: "Sophie Bennett",
    initials: "SB",
    phone: "+1 (415) 555-0165",
    email: "sophie.b@example.com",
    address: "94 Cole Street, San Francisco",
    since: "Customer since November 2025",
    note: "Tenant. Landlord approval is required for repairs over $250.",
  },
  {
    id: "c4",
    name: "Daniel Okafor",
    initials: "DO",
    phone: "+1 (415) 555-0107",
    email: "daniel.o@example.com",
    address: "2206 Bryant Street, San Francisco",
    since: "New customer",
    note: "Best reached by email during work hours.",
  },
  {
    id: "c5",
    name: "Maya Patel",
    initials: "MP",
    phone: "+1 (415) 555-0177",
    email: "maya.patel@example.com",
    address: "51 Divisadero Street, San Francisco",
    since: "Customer since January 2025",
    note: "Uses fragrance-free cleaning products kept under the kitchen sink.",
  },
];

export const initialBookings: Booking[] = [
  {
    id: "b1",
    customerId: "c2",
    customer: "Marcus Lee",
    service: "Tap repair",
    staff: "Noah",
    day: "Mon",
    date: "Aug 17",
    time: "9:00 AM",
    duration: "1h 30m",
    status: "In progress",
    address: "731 20th Avenue",
  },
  {
    id: "b2",
    customerId: "c3",
    customer: "Sophie Bennett",
    service: "Drywall repair",
    staff: "Eli",
    day: "Tue",
    date: "Aug 18",
    time: "10:00 AM",
    duration: "2h",
    status: "Confirmed",
    address: "94 Cole Street",
  },
  {
    id: "b3",
    customerId: "c1",
    customer: "Alice Morgan",
    service: "Deep home clean",
    staff: "Jamie + Rosa",
    day: "Tue",
    date: "Aug 18",
    time: "2:30 PM",
    duration: "3h",
    status: "Needs approval",
    address: "1842 Pine Street",
  },
  {
    id: "b4",
    customerId: "c5",
    customer: "Maya Patel",
    service: "Home clean + oven",
    staff: "Jamie",
    day: "Wed",
    date: "Aug 19",
    time: "8:30 AM",
    duration: "3h",
    status: "Confirmed",
    address: "51 Divisadero Street",
  },
  {
    id: "b5",
    customerId: "c4",
    customer: "Daniel Okafor",
    service: "Door hinge repair",
    staff: "Eli",
    day: "Thu",
    date: "Aug 20",
    time: "1:00 PM",
    duration: "1h",
    status: "Confirmed",
    address: "2206 Bryant Street",
  },
  {
    id: "b6",
    customerId: "c1",
    customer: "Alice Morgan",
    service: "Window track repair",
    staff: "Noah",
    day: "Fri",
    date: "Aug 21",
    time: "11:30 AM",
    duration: "1h 30m",
    status: "Confirmed",
    address: "1842 Pine Street",
  },
];

export const initialTasks: AgentTask[] = [
  {
    id: "t1",
    title: "Proposed a new time for deep clean",
    customer: "Alice Morgan",
    time: "4 min ago",
    status: "Approval needed",
    checked: ["Original booking", "Rescheduling policy", "Jamie + Rosa’s availability"],
    outcome: "Tuesday, Aug 18 at 2:30 PM is ready to confirm.",
  },
  {
    id: "t2",
    title: "Answered a pricing question",
    customer: "Marcus Lee",
    time: "18 min ago",
    status: "Completed",
    checked: ["Plumbing price guide", "Call-out policy", "Service area"],
    outcome: "Explained that the $65 call-out fee is credited toward completed repairs.",
  },
  {
    id: "t3",
    title: "Confirmed tomorrow’s repair",
    customer: "Sophie Bennett",
    time: "42 min ago",
    status: "Completed",
    checked: ["Appointment status", "Assigned technician", "Customer reply"],
    outcome: "Booking confirmed. Sophie received the arrival details.",
  },
  {
    id: "t4",
    title: "Reviewed a new repair request",
    customer: "Daniel Okafor",
    time: "1 hr ago",
    status: "In progress",
    checked: ["Customer photo", "Repair categories", "Technician skills"],
    outcome: "Checking the next suitable one-hour appointment with Eli.",
  },
  {
    id: "t5",
    title: "Added an oven-cleaning add-on",
    customer: "Maya Patel",
    time: "2 hr ago",
    status: "Completed",
    checked: ["Add-on price", "Service duration", "Friday’s route"],
    outcome: "Added the service for $45 without changing the arrival time.",
  },
];
export const weekDays = [
  { day: "Mon", date: "17", label: "Today" },
  { day: "Tue", date: "18", label: "" },
  { day: "Wed", date: "19", label: "" },
  { day: "Thu", date: "20", label: "" },
  { day: "Fri", date: "21", label: "" },
];
