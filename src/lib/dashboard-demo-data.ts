export type CandidateStatus =
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "hired"
    | "rejected"

export type Job = {
    id: string
    title: string
    status: "open" | "draft" | "closed"
}

export type Candidate = {
    id: string
    name: string
    email: string
    resumeText: string | null
    status: CandidateStatus
    createdAt: string
    job: {
        id: string
        title: string
    }
}

const daysAgo = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
}

export const dashboardDemoJobs: Job[] = [
    { id: "job-1", title: "Senior Frontend Engineer", status: "open" },
    { id: "job-2", title: "Backend Platform Engineer", status: "open" },
    { id: "job-3", title: "Founding Product Engineer", status: "draft" },
    { id: "job-4", title: "ML Infrastructure Engineer", status: "closed" },
]

export const dashboardDemoCandidates: Candidate[] = [
    {
        id: "cand-1",
        name: "Ava Thompson",
        email: "ava.thompson@example.com",
        resumeText: "Experienced Frontend Engineer with 5+ years building React applications at scale.",
        status: "applied",
        createdAt: daysAgo(1),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-2",
        name: "Noah Kim",
        email: "noah.kim@example.com",
        resumeText: "Experienced backend engineer skilled in distributed systems and API design.",
        status: "screening",
        createdAt: daysAgo(2),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-3",
        name: "Maya Patel",
        email: "maya.patel@example.com",
        resumeText: "Full-stack developer with expertise in React, Node.js, and cloud infrastructure.",
        status: "interview",
        createdAt: daysAgo(3),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-4",
        name: "Liam Rivera",
        email: "liam.rivera@example.com",
        resumeText: "Platform engineer focused on building scalable microservices and developer tooling.",
        status: "offer",
        createdAt: daysAgo(4),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-5",
        name: "Emma Walker",
        email: "emma.walker@example.com",
        resumeText: "ML engineer with strong Python and TensorFlow experience. Built production ML pipelines.",
        status: "hired",
        createdAt: daysAgo(5),
        job: { id: "job-4", title: "ML Infrastructure Engineer" },
    },
    {
        id: "cand-6",
        name: "Ethan Brooks",
        email: "ethan.brooks@example.com",
        resumeText: "Product engineer with startup experience. Built products from 0 to 1 at multiple companies.",
        status: "applied",
        createdAt: daysAgo(6),
        job: { id: "job-3", title: "Founding Product Engineer" },
    },
    {
        id: "cand-7",
        name: "Sophia Chen",
        email: "sophia.chen@example.com",
        resumeText: "Senior frontend architect specializing in design systems and performance optimization.",
        status: "screening",
        createdAt: daysAgo(7),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-8",
        name: "Lucas James",
        email: "lucas.james@example.com",
        resumeText: "Backend engineer with Go and PostgreSQL expertise. Built high-throughput API services.",
        status: "rejected",
        createdAt: daysAgo(9),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-9",
        name: "Olivia Martin",
        email: "olivia.martin@example.com",
        resumeText: "Versatile engineer with full-stack capabilities. Experienced in React, Python, and AWS.",
        status: "interview",
        createdAt: daysAgo(10),
        job: { id: "job-3", title: "Founding Product Engineer" },
    },
    {
        id: "cand-10",
        name: "James Carter",
        email: "james.carter@example.com",
        resumeText: "ML infrastructure engineer with expertise in Kubernetes, MLOps, and model serving.",
        status: "hired",
        createdAt: daysAgo(12),
        job: { id: "job-4", title: "ML Infrastructure Engineer" },
    },
    {
        id: "cand-11",
        name: "Isabella Moore",
        email: "isabella.moore@example.com",
        resumeText: "Senior frontend engineer with strong UX sensibilities and React expertise.",
        status: "offer",
        createdAt: daysAgo(13),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-12",
        name: "Benjamin Lee",
        email: "benjamin.lee@example.com",
        resumeText: "Backend platform engineer skilled in Rust, distributed systems, and database internals.",
        status: "applied",
        createdAt: daysAgo(14),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
]
