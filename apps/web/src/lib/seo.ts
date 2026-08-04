const LOCAL_SITE_URL = "http://127.0.0.1:3000";

export const SITE_NAME = "NiceToMeetU";
export const SITE_DESCRIPTION = "Practise the language you are learning in 30-minute video sessions with small international groups of two to four people.";

export function siteUrl(): URL {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL ?? LOCAL_SITE_URL);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}

export function absoluteSiteUrl(path = "/"): string {
  return new URL(path, siteUrl()).toString();
}

export function websiteStructuredData() {
  const url = absoluteSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${url}#organization` }
      }
    ]
  };
}
