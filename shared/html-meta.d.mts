export declare const escapeHtml: (value: unknown) => string;
export declare const applyPageMeta: (
  html: string,
  page: {
    title: string;
    description: string;
    url: string;
    heading?: string;
    jsonLd?: object[];
    links?: { href: string; label: string }[];
    noindex?: boolean;
    bodyHtml?: string;
    state?: object;
    pageId?: string;
  },
) => string;
