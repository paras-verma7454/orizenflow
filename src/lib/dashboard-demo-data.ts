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
    resumeUrl: string
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
        resumeUrl: "https://example.com/resumes/ava-thompson.pdf",
        status: "applied",
        createdAt: daysAgo(1),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-2",
        name: "Noah Kim",
        email: "noah.kim@example.com",
        resumeUrl: "https://example.com/resumes/noah-kim.pdf",
        status: "screening",
        createdAt: daysAgo(2),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-3",
        name: "Maya Patel",
        email: "maya.patel@example.com",
        resumeUrl: "https://example.com/resumes/maya-patel.pdf",
        status: "interview",
        createdAt: daysAgo(3),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-4",
        name: "Liam Rivera",
        email: "liam.rivera@example.com",
        resumeUrl: "https://example.com/resumes/liam-rivera.pdf",
        status: "offer",
        createdAt: daysAgo(4),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-5",
        name: "Emma Walker",
        email: "emma.walker@example.com",
        resumeUrl: "https://example.com/resumes/emma-walker.pdf",
        status: "hired",
        createdAt: daysAgo(5),
        job: { id: "job-4", title: "ML Infrastructure Engineer" },
    },
    {
        id: "cand-6",
        name: "Ethan Brooks",
        email: "ethan.brooks@example.com",
        resumeUrl: "https://example.com/resumes/ethan-brooks.pdf",
        status: "applied",
        createdAt: daysAgo(6),
        job: { id: "job-3", title: "Founding Product Engineer" },
    },
    {
        id: "cand-7",
        name: "Sophia Chen",
        email: "sophia.chen@example.com",
        resumeUrl: "https://example.com/resumes/sophia-chen.pdf",
        status: "screening",
        createdAt: daysAgo(7),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-8",
        name: "Lucas James",
        email: "lucas.james@example.com",
        resumeUrl: "https://example.com/resumes/lucas-james.pdf",
        status: "rejected",
        createdAt: daysAgo(9),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
    {
        id: "cand-9",
        name: "Olivia Martin",
        email: "olivia.martin@example.com",
        resumeUrl: "https://example.com/resumes/olivia-martin.pdf",
        status: "interview",
        createdAt: daysAgo(10),
        job: { id: "job-3", title: "Founding Product Engineer" },
    },
    {
        id: "cand-10",
        name: "James Carter",
        email: "james.carter@example.com",
        resumeUrl: "https://example.com/resumes/james-carter.pdf",
        status: "hired",
        createdAt: daysAgo(12),
        job: { id: "job-4", title: "ML Infrastructure Engineer" },
    },
    {
        id: "cand-11",
        name: "Isabella Moore",
        email: "isabella.moore@example.com",
        resumeUrl: "https://example.com/resumes/isabella-moore.pdf",
        status: "offer",
        createdAt: daysAgo(13),
        job: { id: "job-1", title: "Senior Frontend Engineer" },
    },
    {
        id: "cand-12",
        name: "Benjamin Lee",
        email: "benjamin.lee@example.com",
        resumeUrl: "https://example.com/resumes/benjamin-lee.pdf",
        status: "applied",
        createdAt: daysAgo(14),
        job: { id: "job-2", title: "Backend Platform Engineer" },
    },
]
