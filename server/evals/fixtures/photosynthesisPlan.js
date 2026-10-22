// A fixed plan for samples/photosynthesis-grade7.pdf, so tutor evals always
// start from the same input and only the tutor's behaviour varies.
export const photosynthesisPlan = {
  title: 'How plants make their food',
  language: 'English',
  languageCode: 'en',
  dir: 'ltr',
  audience: '7th graders',
  durationMinutes: 10,
  scope:
    'Covers the inputs, outputs and equation of photosynthesis; limiting factors are left out.',
  passages: [
    {
      id: 'P1',
      location: 'Page 1, section 4.1',
      text: 'Plants are different: they make their own food. The process plants use to make food is called **photosynthesis**.',
    },
    {
      id: 'P2',
      location: 'Page 1, section 4.2',
      text: 'It takes in **carbon dioxide** from the air through tiny openings on the underside of its leaves, called **stomata**. It takes in **water** from the soil through its roots; the water travels up the stem to the leaves. And it needs **light energy**, usually from the Sun.',
    },
    {
      id: 'P3',
      location: 'Page 1, equation',
      text: '$6CO_2 + 6H_2O \\xrightarrow{light} C_6H_{12}O_6 + 6O_2$',
    },
    {
      id: 'P4',
      location: 'Page 2, section 4.3',
      text: 'Photosynthesis also gives us the oxygen we breathe.',
    },
  ],
  steps: [
    {
      title: 'What a plant needs',
      objective: 'Name the three inputs of photosynthesis and where each one enters the plant.',
      keyPoints: [
        'Carbon dioxide from the air, through the stomata',
        'Water from the soil, through the roots',
        'Light energy from the Sun',
      ],
      passageIds: ['P1', 'P2'],
      checkQuestion:
        'A plant has three "ingredients" for its food. What are they, and how does each one get in?',
    },
    {
      title: 'What a plant makes',
      objective: 'Explain that photosynthesis produces glucose and oxygen, using the equation.',
      keyPoints: ['Glucose is the plant’s food', 'Oxygen is released into the air'],
      passageIds: ['P3', 'P4'],
      checkQuestion:
        'Using the equation, what two things does the plant make, and which one do we breathe?',
    },
  ],
};

export const TEACHER_PROMPT = 'Teach this to 7th graders. Be Socratic. Keep it under 10 minutes.';
