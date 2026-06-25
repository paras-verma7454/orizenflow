export type Job = {
    id: string;
    shortId: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    jobType: string;
    location: string | null;
    salaryRange: string | null;
    questions: Array<{ id: string; prompt: string; required: boolean }>;
    createdAt: string;
    organization: {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
        tagline: string | null;
        about: string | null;
        websiteUrl: string | null;
        linkedinUrl: string | null;
        website?: string | null;
        linkedin?: string | null;
    };
};

export const statusLabelMap: Record<string, string> = {
    open: "Actively hiring",
    closed: "Closed",
    filled: "Filled",
};

export const jobTypeLabelMap: Record<string, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    "on-site": "On-site",
};

export function statusBadgeVariant(status: string) {
    switch (status) {
        case "open":
            return "outline" as const;
        case "closed":
            return "destructive" as const;
        case "filled":
            return "outline" as const;
        case "draft":
            return "secondary" as const;
        default:
            return "secondary" as const;
    }
}

export function statusBadgeClassName(status: string) {
    switch (status) {
        case "open":
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
        case "closed":
            return "";
        case "filled":
            return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300";
        default:
            return "";
    }
}
