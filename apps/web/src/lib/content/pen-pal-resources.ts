export type PenPalPromptGroup = {
  id: string;
  label: string;
  introduction: string;
  prompts: readonly string[];
};

export type PenPalResource = {
  slug: string;
  label: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  introduction: string;
  sections: readonly {
    heading: string;
    paragraphs: readonly string[];
  }[];
  faqs: readonly {
    question: string;
    answer: string;
  }[];
  relatedGuideSlug: string;
  relatedGuideLanguage: string;
  promptGroups?: readonly PenPalPromptGroup[];
};

export const penPalResources: readonly PenPalResource[] = [
  {
    slug: "find-language-pen-pals",
    label: "Find a language pen pal",
    seoTitle: "How to Find a Language Pen Pal",
    seoDescription: "Find a language pen pal with shared goals, respectful first messages, and a simple routine that turns correspondence into regular speaking practice.",
    h1: "How to find a language pen pal and keep the exchange going",
    introduction: "A good language pen pal is not just someone who knows the language you are learning. It is someone with a compatible rhythm, clear expectations, and enough curiosity to keep a conversation moving over time.",
    sections: [
      {
        heading: "Decide what you want to practise first",
        paragraphs: [
          "Start with a simple goal: getting more comfortable with everyday English, preparing for a trip, learning how people describe local routines, or using a language you already study. A clear goal makes it easier to recognise a compatible exchange.",
          "You do not need a perfect language level to begin. It helps to say what you can comfortably discuss, how often you want to write or speak, and whether you prefer short messages, a scheduled call, or both."
        ]
      },
      {
        heading: "Write a first message that gives someone an easy reply",
        paragraphs: [
          "A respectful first message is short, specific, and easy to answer. Mention one shared interest, explain the language you are practising, and ask one open question instead of sending a long introduction.",
          "For example, you might ask what a normal weekend looks like where they live, what music they recommend, or which local place they would show a visitor. Those questions invite a story and reveal whether the conversation has a natural rhythm."
        ]
      },
      {
        heading: "Add speaking before the exchange becomes repetitive",
        paragraphs: [
          "Writing gives you time to think. Speaking helps you practise finding words, listening to another person, and responding in the moment. A short call can make a correspondence feel more human without replacing the slower pace of messages.",
          "NiceToMeetU is not a directory of private pen-pal profiles. It gives adult language learners a focused way to practise live in small international groups, so a written exchange can grow into regular speaking practice."
        ]
      }
    ],
    faqs: [
      {
        question: "How do I find a good language pen pal?",
        answer: "Look for shared goals, a compatible schedule, and an exchange that feels balanced. A brief first message with one clear question is usually a better start than trying to describe everything about yourself."
      },
      {
        question: "What should I say in a first message to a pen pal?",
        answer: "Introduce one interest, explain the language you want to practise, and ask an open question about a familiar topic. Give the other person an easy way to reply."
      },
      {
        question: "Can pen pals help with language learning?",
        answer: "Yes. Correspondence can expose you to everyday language and cultural context. Adding regular speaking practice helps you use that language in real time."
      }
    ],
    relatedGuideSlug: "english-speaking-practice",
    relatedGuideLanguage: "English"
  },
  {
    slug: "pen-pal-conversation-starters",
    label: "Pen-pal conversation starters",
    seoTitle: "Pen Pal Conversation Starters and Questions",
    seoDescription: "Use original pen pal conversation starters for first messages, follow-up questions, and friendly language-exchange conversations.",
    h1: "Pen pal conversation starters that lead to real exchanges",
    introduction: "The best pen pal questions are not clever icebreakers. They make it easy for someone to share an experience, explain a preference, or ask you the same question in return.",
    sections: [
      {
        heading: "Choose questions with room for a story",
        paragraphs: [
          "Questions about routines, local places, food, hobbies, and small decisions are easier to answer than questions that ask someone to reveal a lot at once. They also give you natural follow-up questions.",
          "Start with one topic rather than a long list. Read the answer carefully, then ask why, request an example, or connect it to something from your own day."
        ]
      },
      {
        heading: "Make the exchange feel balanced",
        paragraphs: [
          "A correspondence works better when both people have space to ask and answer. Share a short answer of your own after a question, especially when you are inviting someone to describe a cultural habit or personal preference.",
          "If a topic does not get much response, change direction without pressure. A simple question about a film, a meal, a local walk, or a recent small success often gives the conversation another opening."
        ]
      },
      {
        heading: "Reuse a good question when you start speaking",
        paragraphs: [
          "A question that worked in writing is useful in a call too. It gives everyone a shared starting point and leaves room for natural follow-up questions.",
          "For live practice, aim for a short topic rather than a script. NiceToMeetU sessions are 30 minutes with two to four people, giving each person time to listen and respond."
        ]
      }
    ],
    faqs: [
      {
        question: "What are good questions to ask a pen pal?",
        answer: "Choose questions about everyday life, local recommendations, hobbies, or a recent experience. The best questions invite a story and make it easy to ask a follow-up."
      },
      {
        question: "How do I keep a pen pal conversation going?",
        answer: "Respond to one detail, ask a related open question, and share a small part of your own experience. A conversation feels more natural when it is not an interview."
      },
      {
        question: "Can I use pen pal questions for speaking practice?",
        answer: "Yes. Familiar questions are a useful bridge from writing to speaking because you already have ideas and vocabulary connected to the topic."
      }
    ],
    relatedGuideSlug: "spanish-speaking-practice",
    relatedGuideLanguage: "Spanish",
    promptGroups: [
      {
        id: "everyday-life",
        label: "Everyday life",
        introduction: "Start with ordinary details that give both people something easy to compare.",
        prompts: [
          "What is one small part of your daily routine that you enjoy?",
          "What does a good weekend look like where you live?",
          "What is a local place you would recommend to a visitor?",
          "What is one meal you could talk about for a long time?"
        ]
      },
      {
        id: "culture-and-interests",
        label: "Culture and interests",
        introduction: "Use recommendations to share context without putting pressure on either person.",
        prompts: [
          "What song, film, or book would you recommend from your country?",
          "Is there a local tradition that visitors often find surprising?",
          "What hobby helps you reset after a busy day?",
          "What is something people often misunderstand about where you live?"
        ]
      },
      {
        id: "learning-and-goals",
        label: "Learning and goals",
        introduction: "Talk about language learning in a way that invites practical ideas.",
        prompts: [
          "What makes learning a language easier for you?",
          "What would you like to be able to talk about more confidently?",
          "What is one phrase you recently learned and want to use?",
          "What kind of conversation would you enjoy practising next?"
        ]
      }
    ]
  },
  {
    slug: "safe-online-language-exchange",
    label: "Safe online language exchange",
    seoTitle: "How to Keep an Online Language Exchange Safe",
    seoDescription: "Use practical privacy, boundary, and reporting habits to keep an online language exchange respectful and focused on learning.",
    h1: "How to keep an online language exchange safe and respectful",
    introduction: "A useful language exchange should feel clear, voluntary, and focused on learning. Simple boundaries help you protect your privacy and make it easier to leave a conversation that no longer feels right.",
    sections: [
      {
        heading: "Share gradually and keep personal details private",
        paragraphs: [
          "You do not need to share an address, workplace, private contact details, or anything that makes you uncomfortable to practise a language. Start with general interests and public, everyday topics.",
          "Use the communication tools provided by the service at first. If someone pressures you to move quickly to another platform or to share more than you want, it is reasonable to say no or end the exchange."
        ]
      },
      {
        heading: "Set a clear learning boundary",
        paragraphs: [
          "Say what you are looking for: language practice, cultural conversation, a short call, or a regular group session. Clear expectations make it easier to notice when a conversation is no longer serving that purpose.",
          "Respectful people accept a boundary without arguing. You do not need to explain or defend a decision to pause, block, or report an interaction that feels unwanted."
        ]
      },
      {
        heading: "Use a format that gives everyone room to participate",
        paragraphs: [
          "A short group conversation can be a more comfortable next step than a private call because the purpose, time limit, and topic are clearer. Prepare one topic and leave when the session ends.",
          "NiceToMeetU uses focused 30-minute speaking sessions for two to four learners. If you ever experience a concern while using the service, use its reporting tools rather than continuing a conversation you do not want."
        ]
      }
    ],
    faqs: [
      {
        question: "How can I protect my privacy in an online language exchange?",
        answer: "Start with general information, keep personal contact details private, and use the service's communication options before deciding whether you want to share anything else."
      },
      {
        question: "What should I do if an online exchange feels uncomfortable?",
        answer: "Stop responding, use available block or report tools, and do not feel obliged to continue. A clear learning boundary is enough."
      },
      {
        question: "Is a group call safer than a private call?",
        answer: "A small group can make expectations and time boundaries clearer, but you should still protect your privacy and leave any conversation that feels unwanted."
      }
    ],
    relatedGuideSlug: "french-speaking-practice",
    relatedGuideLanguage: "French"
  }
];

export function penPalResourceForSlug(slug: string): PenPalResource | undefined {
  return penPalResources.find((resource) => resource.slug === slug);
}
