export type PlannerTheme = {
  id: string;
  label: string;
  introduction: string;
  prompts: readonly string[];
};

export type SpeakingGuide = {
  slug: string;
  language: string;
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
  plannerThemes: readonly PlannerTheme[];
};

export const speakingGuides = [
  {
    slug: "spanish-speaking-practice",
    language: "Spanish",
    seoTitle: "How to Practise Spanish Speaking",
    seoDescription: "Build a regular Spanish speaking practice with small-group conversations, useful routines, and a free 30-minute conversation planner.",
    h1: "How to practise Spanish speaking when you need real conversation",
    introduction: "Grammar exercises and vocabulary apps are useful, but they do not replace the moment when you have to find words, listen closely, and respond in Spanish. A repeatable speaking routine makes that moment less intimidating.",
    sections: [
      {
        heading: "Make speaking a separate habit",
        paragraphs: [
          "Reading and listening can happen alone. Speaking needs a different kind of practice: a real reason to respond, enough time to finish a thought, and people who are there for the same purpose.",
          "Choose a small, regular slot for Spanish conversation. A short session is easier to protect in a busy week than an ambitious plan that never happens."
        ]
      },
      {
        heading: "Use topics that create follow-up questions",
        paragraphs: [
          "A useful conversation topic is specific enough to start quickly and open enough to invite a second question. Food, a recent trip, routines, films, local traditions, and a small decision you are making all work well.",
          "Prepare a few connecting phrases before you join: \"Que piensas?\", \"Por que?\", \"Puedes darme un ejemplo?\", and \"A mi tambien me pasa\". They help a conversation continue even when your vocabulary is limited."
        ]
      },
      {
        heading: "Aim for communication, not perfect sentences",
        paragraphs: [
          "Fluency grows when you keep the exchange moving. If a word is missing, describe it, ask for help, or say the idea another way. Those repair skills are part of speaking well.",
          "After a conversation, note one phrase you wanted but could not use. Review it before the next session and look for one chance to use it naturally."
        ]
      }
    ],
    faqs: [
      {
        question: "How often should I practise speaking Spanish?",
        answer: "A regular rhythm matters more than a long session. Start with one or two short conversations each week, then increase only when that routine feels sustainable."
      },
      {
        question: "Can beginners practise Spanish conversation?",
        answer: "Yes. Start with familiar themes, short answers, and follow-up questions. It is fine to pause, ask someone to repeat a phrase, or use a simpler sentence."
      },
      {
        question: "How can I become more fluent in Spanish?",
        answer: "Combine input with repeated speaking. Listen and read to collect useful language, then use that language in conversations where you must react in real time."
      }
    ],
    plannerThemes: [
      {
        id: "daily-life",
        label: "Daily life",
        introduction: "Use familiar routines to practise clear descriptions and follow-up questions.",
        prompts: ["Como es un dia normal para ti?", "Que parte de tu rutina te gustaria cambiar?", "Que haces cuando tienes una hora libre?", "Que pequena cosa hizo tu dia mejor esta semana?"]
      },
      {
        id: "travel",
        label: "Travel and places",
        introduction: "Compare places, memories, and plans while practising past and future language.",
        prompts: ["Que lugar recuerdas con mas carino?", "Que recomendarias a alguien que visita tu ciudad?", "Que viaje te gustaria hacer despues?", "Que diferencia notas entre dos lugares que conoces?"]
      },
      {
        id: "culture",
        label: "Culture and media",
        introduction: "Share a recommendation and explain the reasons behind your opinion.",
        prompts: ["Que pelicula, serie o libro recomendarias?", "Que musica escuchas cuando quieres concentrarte?", "Que tradicion local te parece interesante?", "Que contenido en espanol te ayuda a aprender?"]
      }
    ]
  },
  {
    slug: "english-speaking-practice",
    language: "English",
    seoTitle: "How to Improve English Speaking Skills",
    seoDescription: "Improve English speaking skills with small-group conversation routines, practical strategies, and a free 30-minute conversation planner.",
    h1: "How to improve English speaking skills through regular conversation",
    introduction: "You can understand a lot of English and still hesitate when it is your turn to speak. The gap closes through repeated conversations where you explain ideas, react to someone else, and recover when a sentence does not come out as planned.",
    sections: [
      {
        heading: "Practise the skill you want to use",
        paragraphs: [
          "Speaking confidence does not come from waiting until you know every word. It comes from using what you know, noticing what is missing, and trying again in the next conversation.",
          "Small groups make that repetition manageable. There is room to speak, listen, and ask a follow-up question without the pressure of a large classroom."
        ]
      },
      {
        heading: "Prepare language that keeps a conversation moving",
        paragraphs: [
          "Before a session, choose one topic and a handful of useful phrases. Try openers such as \"From my point of view\", \"Could you tell me more about that?\", and \"I had a similar experience\".",
          "When you do not understand, ask directly and calmly: \"Could you say that again?\" or \"What do you mean by...?\" These are practical speaking skills, not signs of failure."
        ]
      },
      {
        heading: "Review for the next conversation",
        paragraphs: [
          "Do a short review after you speak. Keep one phrase you used successfully and one idea you could not express yet. This turns every conversation into material for the next one.",
          "Progress is easier to notice when you return to familiar topics. You will hear yourself give longer answers, ask better questions, and need less time to begin."
        ]
      }
    ],
    faqs: [
      {
        question: "What is the best way to practise English speaking?",
        answer: "Use a consistent mix of listening, useful phrase review, and real conversation. The conversation part matters because it requires you to react instead of only recognising words."
      },
      {
        question: "How can I speak English more confidently?",
        answer: "Choose small, repeatable conversations and allow yourself to use simple language. Confidence grows from completing many imperfect exchanges, not from avoiding mistakes."
      },
      {
        question: "How long should English speaking practice last?",
        answer: "Thirty focused minutes is enough to warm up, exchange ideas, and review a few useful phrases afterwards. Consistency is more valuable than an occasional long session."
      }
    ],
    plannerThemes: [
      {
        id: "work-and-study",
        label: "Work and study",
        introduction: "Explain routines, goals, and decisions with practical vocabulary.",
        prompts: ["What part of your work or study do you enjoy most?", "What skill would you like to improve this year?", "How do you stay focused on a difficult task?", "What advice would you give someone starting in your field?"]
      },
      {
        id: "weekend",
        label: "Weekend plans",
        introduction: "Use plans and recent experiences to practise natural follow-up questions.",
        prompts: ["What makes a good weekend for you?", "What did you do last weekend that you would do again?", "Do you prefer planning ahead or deciding at the last minute?", "What is one local activity you would recommend?"]
      },
      {
        id: "opinions",
        label: "Opinions and choices",
        introduction: "Compare options and give reasons without needing specialist vocabulary.",
        prompts: ["What is a small change that improves everyday life?", "Would you rather live in a busy city or a quieter place?", "What makes a recommendation trustworthy?", "What is a habit you think more people should try?"]
      }
    ]
  },
  {
    slug: "french-speaking-practice",
    language: "French",
    seoTitle: "How to Practise French Speaking",
    seoDescription: "Practise French speaking with realistic conversation routines, useful repair strategies, and a free 30-minute conversation planner.",
    h1: "How to practise French speaking and keep the conversation going",
    introduction: "French speaking practice becomes more useful when it includes the small moments of real conversation: asking someone to repeat an idea, explaining around a missing word, and responding to an unexpected question.",
    sections: [
      {
        heading: "Build a routine around real exchanges",
        paragraphs: [
          "Set aside a regular time for French conversation instead of waiting for a perfect opportunity. A short, repeatable session gives you more chances to turn passive vocabulary into something you can use.",
          "A small group helps everyone contribute. You can practise listening to different voices while still having enough time to finish your own ideas."
        ]
      },
      {
        heading: "Start with language you can reuse",
        paragraphs: [
          "Choose a familiar topic and prepare a few flexible phrases: \"A mon avis\", \"Je ne suis pas sur de comprendre\", \"Tu peux donner un exemple?\", and \"Ca me fait penser a...\".",
          "Do not try to memorise a full speech. Prepare questions, opinions, and examples that you can adapt to what other people say."
        ]
      },
      {
        heading: "Treat corrections as useful signals",
        paragraphs: [
          "You do not need to interrupt every sentence for a correction. Keep the conversation moving, then write down one or two phrases you want to improve afterwards.",
          "The next session is the opportunity to reuse those phrases. Reuse makes vocabulary easier to retrieve when you need it."
        ]
      }
    ],
    faqs: [
      {
        question: "How can I practise speaking French at home?",
        answer: "Prepare a simple topic, review a few useful phrases, and join a real conversation online. A short spoken exchange adds practice that reading and exercises cannot provide alone."
      },
      {
        question: "What should I say when I forget a word in French?",
        answer: "Describe the idea another way, ask for the word, or use a simpler phrase. Keeping the exchange going is more useful than stopping for a perfect translation."
      },
      {
        question: "Do I need to be advanced to join a French conversation?",
        answer: "No. Familiar topics and short questions work at many levels. Choose a pace and group where you can listen, answer, and ask for clarification."
      }
    ],
    plannerThemes: [
      {
        id: "food",
        label: "Food and routines",
        introduction: "Describe preferences and memories with accessible everyday vocabulary.",
        prompts: ["Quel repas te rappelle le plus ton enfance?", "Tu preferes cuisiner ou manger dehors?", "Quel plat aimerais-tu apprendre a faire?", "Comment choisis-tu un nouveau restaurant?"]
      },
      {
        id: "city",
        label: "City life",
        introduction: "Compare neighbourhoods and explain what makes a place comfortable.",
        prompts: ["Qu est-ce que tu aimes dans ton quartier?", "Comment te deplaces-tu le plus souvent?", "Quel endroit calme conseillerais-tu dans ta ville?", "Quelle chose manque dans ton quartier ideal?"]
      },
      {
        id: "learning",
        label: "Learning and hobbies",
        introduction: "Share a personal interest and ask questions that invite a story.",
        prompts: ["Qu est-ce que tu apprends en ce moment?", "Quel loisir te detend vraiment?", "Comment as-tu commence cette activite?", "Quel conseil donnerais-tu a un debutant?"]
      }
    ]
  },
  {
    slug: "german-speaking-practice",
    language: "German",
    seoTitle: "How to Practise German Speaking",
    seoDescription: "Practise German speaking with a repeatable conversation routine, practical phrases, and a free 30-minute conversation planner.",
    h1: "How to practise German speaking with clear, regular conversation",
    introduction: "German speaking practice gets easier when you stop treating every sentence as a test. Conversation gives you repeated chances to explain a thought, ask for more detail, and find a simpler way to say what you mean.",
    sections: [
      {
        heading: "Use short sessions to make speaking regular",
        paragraphs: [
          "A regular thirty-minute conversation is long enough to settle into the language without becoming overwhelming. The goal is not to cover everything; it is to keep using German often enough that starting feels normal.",
          "Choose a recurring time and a small group. Familiarity with the format helps you focus on the conversation rather than on the logistics."
        ]
      },
      {
        heading: "Prepare building blocks, not scripts",
        paragraphs: [
          "Bring a topic, a few opinions, and questions you can ask other people. Phrases like \"Ich glaube, dass...\", \"Wie siehst du das?\", and \"Kannst du das genauer erklaren?\" give you ways to connect ideas.",
          "If a sentence becomes too complicated, make it shorter. Clear communication is more important than using the most advanced grammar you know."
        ]
      },
      {
        heading: "Notice the language you need next",
        paragraphs: [
          "After each session, write down one useful word or phrase that would have made an answer easier. Review it before the next conversation and try to use it once.",
          "This small loop connects conversation with study while keeping speaking at the centre of your routine."
        ]
      }
    ],
    faqs: [
      {
        question: "How can I get better at speaking German?",
        answer: "Speak regularly about familiar topics, prepare flexible phrases, and review the language you needed after each conversation. Frequent use makes words easier to retrieve."
      },
      {
        question: "Is it okay to make grammar mistakes while speaking German?",
        answer: "Yes. Mistakes are part of using a language in real time. Focus first on being understood, then keep a small number of corrections to review later."
      },
      {
        question: "What topics are good for German conversation practice?",
        answer: "Daily routines, local places, hobbies, films, travel memories, and small decisions work well because they invite personal examples and follow-up questions."
      }
    ],
    plannerThemes: [
      {
        id: "routine",
        label: "Routines and balance",
        introduction: "Describe your week and compare habits with other speakers.",
        prompts: ["Wie sieht ein guter Tag fur dich aus?", "Welche Gewohnheit willst du behalten?", "Wann hast du am meisten Energie?", "Wie machst du nach einem anstrengenden Tag Pause?"]
      },
      {
        id: "places",
        label: "Places and memories",
        introduction: "Tell a story about a place and invite another person to compare it.",
        prompts: ["An welchen Ort denkst du gern zuruck?", "Was sollte man in deiner Stadt sehen?", "Wo wurdest du gern einen Monat wohnen?", "Was macht einen Ort fur dich besonders?"]
      },
      {
        id: "choices",
        label: "Choices and recommendations",
        introduction: "Give reasons, compare options, and ask for another perspective.",
        prompts: ["Welche kleine Anschaffung war fur dich wirklich nutzlich?", "Wie entscheidest du dich zwischen zwei Optionen?", "Was kannst du anderen Lernenden empfehlen?", "Welche App oder welches Werkzeug nutzt du oft?"]
      }
    ]
  },
  {
    slug: "japanese-speaking-practice",
    language: "Japanese",
    seoTitle: "How to Practise Japanese Speaking",
    seoDescription: "Practise Japanese speaking with small-group conversation routines, practical communication strategies, and a free 30-minute conversation planner.",
    h1: "How to practise Japanese speaking through useful, repeated conversation",
    introduction: "Japanese study can involve a lot of reading, listening, and memorisation. Speaking adds a different challenge: choosing words at the moment, responding politely, and continuing even when you need time to think.",
    sections: [
      {
        heading: "Give speaking its own place in your study plan",
        paragraphs: [
          "Listening and reading help you recognise Japanese. Conversation helps you produce it. A regular speaking session lets you practise the transition from understanding a phrase to using it for your own idea.",
          "Start with topics you know well so you can spend your energy on communicating rather than inventing an answer from nothing."
        ]
      },
      {
        heading: "Use clarification and repair phrases",
        paragraphs: [
          "Conversation does not need to stop when you miss something. Phrases such as \"Mou ichido onegaishimasu\", \"Dou iu imi desu ka\", and \"Chotto kangaete mo ii desu ka\" help you stay in the exchange.",
          "It is also useful to ask simple follow-ups. Curiosity gives you a reason to listen closely and makes a group conversation more balanced."
        ]
      },
      {
        heading: "Keep the next step small",
        paragraphs: [
          "After speaking, choose one phrase, sound, or expression to revisit. Trying to improve one small thing in the next session is more realistic than trying to correct every mistake at once.",
          "Over time, familiar conversation patterns become easier to access and you can spend more attention on what you want to say."
        ]
      }
    ],
    faqs: [
      {
        question: "How can I practise Japanese speaking without living in Japan?",
        answer: "Use online conversations with people who want to practise too. A regular small group gives you chances to respond in real time from wherever you live."
      },
      {
        question: "What should I do when I cannot understand Japanese in conversation?",
        answer: "Ask for repetition, a simpler explanation, or an example. These requests are natural conversation tools and help you keep practising instead of withdrawing."
      },
      {
        question: "Should I wait until I know more Japanese before speaking?",
        answer: "No. Start with topics and phrases that match your current level. Speaking shows you exactly which language is most useful to learn next."
      }
    ],
    plannerThemes: [
      {
        id: "daily-life",
        label: "Daily life",
        introduction: "Use familiar routines to focus on clear, manageable answers.",
        prompts: ["Fudan wa dounna ichinichi desu ka?", "Ima ichiban tanoshimi ni shite iru koto wa nan desu ka?", "Shuumatsu wa yoku nani o shimasu ka?", "Saikin yokatta koto wa nan desu ka?"]
      },
      {
        id: "recommendations",
        label: "Recommendations",
        introduction: "Share a recommendation and ask why another person likes theirs.",
        prompts: ["Osusume no eiga ya anime wa arimasu ka?", "Yoku iku mise wa arimasu ka?", "Donna ongaku o kiku no ga suki desu ka?", "Dareka ni oshietai shuukan wa arimasu ka?"]
      },
      {
        id: "plans",
        label: "Plans and goals",
        introduction: "Practise talking about a next step and responding to another person's plan.",
        prompts: ["Kotoshi yaritai koto wa nan desu ka?", "Tsugi no kyuuji ni nani o shitai desu ka?", "Atarashiku hajimetai koto wa arimasu ka?", "Mokuhyou no tame ni donna junbi o shimasu ka?"]
      }
    ]
  },
  {
    slug: "korean-speaking-practice",
    language: "Korean",
    seoTitle: "How to Practise Korean Speaking",
    seoDescription: "Practise Korean speaking with practical conversation habits, small-group exchange, and a free 30-minute conversation planner.",
    h1: "How to practise Korean speaking with conversations you can repeat",
    introduction: "Learning Korean through lessons and media can build a strong base. Speaking practice helps you use that base with another person, respond to new ideas, and become more comfortable with the pace of conversation.",
    sections: [
      {
        heading: "Move from recognition to response",
        paragraphs: [
          "It is common to understand a phrase when you hear it and still need time to say it yourself. Conversation creates the useful pressure of choosing a response, then gives you another chance the next time.",
          "Keep the setting small and the topic familiar. That makes it easier to hear other people and contribute your own experience."
        ]
      },
      {
        heading: "Prepare helpful conversation moves",
        paragraphs: [
          "A few flexible phrases can make speaking feel less fragile: \"Dasi malhae juseyo\", \"Museun tteusieyo?\", and \"Je saenggageun...\". They give you a way to ask, clarify, and share an opinion.",
          "Questions are especially useful. Ask what someone enjoys, why they chose something, or what they would recommend. A good follow-up creates more speaking time for everyone."
        ]
      },
      {
        heading: "Make every session feed the next one",
        paragraphs: [
          "After a conversation, choose one expression you wanted to say and one expression you heard that you liked. Review them briefly, then use one in your next session.",
          "This simple cycle lets you see progress in useful language rather than trying to measure every part of fluency at once."
        ]
      }
    ],
    faqs: [
      {
        question: "How can I practise Korean speaking as a beginner?",
        answer: "Use everyday themes, short responses, and simple follow-up questions. It is fine to ask someone to repeat or explain an idea while you build confidence."
      },
      {
        question: "What helps Korean conversation feel more natural?",
        answer: "Regular conversations, active listening, and reusable response phrases help. Focus on replying to the person in front of you rather than reciting a memorised script."
      },
      {
        question: "How do I remember Korean words when speaking?",
        answer: "Notice the words you needed in a real conversation, review a small number of them, and try to reuse them soon. Retrieval improves when a word has a personal context."
      }
    ],
    plannerThemes: [
      {
        id: "interests",
        label: "Interests and hobbies",
        introduction: "Share what you enjoy and invite stories from other speakers.",
        prompts: ["Yojeum jeulgeoun chwimineun mwo-yeyo?", "Eotteoke geu chwimi-reul sijakhaesseoyo?", "Sigan-i natdamyeon mwo-reul hago sipeoyo?", "Dareun saram-ege chuchunhago sipeun geosi innayo?"]
      },
      {
        id: "food",
        label: "Food and everyday choices",
        introduction: "Use familiar preferences to practise descriptions and reasons.",
        prompts: ["Joahaneun eumsig-eun mwo-yeyo?", "Yojeum saeropge meogeun geosi innayo?", "Jibeseo yori haneun geol joahaseyo?", "Gajang chuchunhago sipeun masjib-eun eodieyo?"]
      },
      {
        id: "memories",
        label: "Memories and plans",
        introduction: "Tell a short story and compare a future plan with another speaker.",
        prompts: ["Gieok-e naneun yeohaeng-i innayo?", "Ibeon dal-e hago sipeun geosi mwo-yeyo?", "Salgo sipeun dosi-ga innayo?", "Eotteon gyeongheom-eul dasi hago sipeoyo?"]
      }
    ]
  }
] as const satisfies readonly SpeakingGuide[];

export function guideForSlug(slug: string): SpeakingGuide | undefined {
  return speakingGuides.find((guide) => guide.slug === slug);
}
