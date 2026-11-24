/**
 * Creates the SLang interest form (and a Google Sheet for the answers) in your
 * own Google account. How to use:
 *   1. Go to script.google.com → New project.
 *   2. Delete what's there, paste this whole file, click Save, then Run.
 *   3. Approve the permissions (it's your own script: "Advanced" → "Go to … (unsafe)"
 *      is Google's standard warning for personal scripts).
 *   4. Open "Execution log": it prints the share link and the edit link.
 * It only creates one form and one sheet. It doesn't read or change anything else.
 */
function createSlangForm() {
  const form = FormApp.create('SLang: learn languages from YouTube (1-minute survey)');
  form.setDescription(
    'SLang is a free Chrome extension that turns YouTube into language practice: captions that ' +
      'explain only the words you don’t know, an AI voice that dubs English videos into the ' +
      'language you’re learning, and Draco, a tiny dragon who quizzes you on new words.\n\n' +
      'This takes about a minute. No name needed; email is optional and only used for early ' +
      'access. Answers are never sold or shared.',
  );
  form.setCollectEmail(false); // no automatic email collection; the email question is optional
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    'Thank you! 🐉 Draco appreciates you. We’ll be in touch if you left an email.',
  );

  // About you
  form
    .addCheckboxItem()
    .setTitle('Which language(s) are you learning, or want to learn?')
    .setChoiceValues([
      'Spanish',
      'French',
      'Japanese',
      'Korean',
      'German',
      'Italian',
      'Portuguese',
      'Mandarin',
      'English',
    ])
    .showOtherOption(true)
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('How well do you know it right now?')
    .setChoiceValues([
      'Total beginner',
      'Know a little (basic phrases)',
      'Intermediate (can follow simple videos)',
      'Advanced (can follow most videos)',
    ])
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('Which language(s) do you speak fluently?')
    .setChoiceValues([
      'English',
      'Spanish',
      'French',
      'Mandarin',
      'Hindi',
      'Korean',
      'Japanese',
      'Portuguese',
    ])
    .showOtherOption(true)
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Age')
    .setChoiceValues(['Under 18', '18–24', '25–34', '35–44', '45+', 'Prefer not to say'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Which best describes you?')
    .setChoiceValues(['High school student', 'College student', 'Working', 'Other'])
    .setRequired(false);

  // Habits
  form
    .addMultipleChoiceItem()
    .setTitle('How much YouTube do you watch in a typical week?')
    .setChoiceValues(['Under 2 hours', '2–5 hours', '5–10 hours', '10+ hours'])
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('How do you learn languages now?')
    .setChoiceValues([
      'Apps (Duolingo, Babbel, etc.)',
      'Classes or a tutor',
      'Videos / TV / podcasts in the language',
      'Flashcards (Anki, Quizlet)',
      'Not currently learning',
    ])
    .showOtherOption(true)
    .setRequired(false);

  // Product
  form
    .addCheckboxItem()
    .setTitle('Which features would you actually use?')
    .setChoiceValues([
      'Captions that explain only the words I don’t know',
      'Dubbing English videos into the language I’m learning',
      'Natural, human-sounding AI voices',
      'Quizzes and review of words I saved',
      'Progress stats and streaks',
      'Works on Netflix and other sites',
      'A phone app',
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Payment
  form
    .addMultipleChoiceItem()
    .setTitle('Would you pay for SLang Pro (natural voices, unlimited quizzes, more languages)?')
    .setChoiceValues(['Yes', 'Maybe', 'No, I’d only use the free version'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('What monthly price feels fair for Pro?')
    .setChoiceValues(['$1–3', '$4–6', '$7–10', 'More than $10', 'I wouldn’t pay'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('How would you rather pay?')
    .setChoiceValues([
      'Monthly subscription',
      'Yearly subscription (cheaper per month)',
      'One-time purchase',
      'Student discount',
      'I wouldn’t pay',
    ])
    .setRequired(false);

  // Contact + feedback
  form
    .addTextItem()
    .setTitle('Email for early access (optional)')
    .setHelpText('Only used to tell you when SLang is ready. Never sold or shared.')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build())
    .setRequired(false);
  form
    .addParagraphTextItem()
    .setTitle('Anything else? Ideas, wishes, roasts: all welcome.')
    .setRequired(false);

  const sheet = SpreadsheetApp.create('SLang survey responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  // Newer Google accounts create forms unpublished; publish it if this API is available.
  if (typeof form.setPublished === 'function') form.setPublished(true);

  const url = form.getPublishedUrl();
  let short = url;
  try {
    short = form.shortenFormUrl(url);
  } catch (e) {
    // the long link works too
  }
  Logger.log('SHARE THIS LINK: ' + short);
  Logger.log('Edit the form:   ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + sheet.getUrl());
}
