/**
 * A deliberately bounded source ledger for these five reflections only.
 * Original prompts and reasoning guides are discussion aids, not scored tests.
 * Primary records establish their contents; game values are authored models.
 */
export const LEARNING_SOURCES = {
  sumter: {
    title: 'Anderson’s evacuation report, with NPS historical context',
    url: 'https://home.nps.gov/articles/battle-of-fort-sumter-april-1861.htm',
    evidenceType: 'Primary report reproduced within institutional history',
    section: 'Fall of Fort Sumter; Evacuation Ceremony; Anderson report to Simon Cameron',
    supports: 'April 13 terms, April 14 evacuation with military honors, and a cheering reception in New York.',
    limitation: 'The report describes the garrison; the reception is NPS context. Neither supplies a numerical morale value.',
  },
  emancipation: {
    title: 'Emancipation Proclamation — original document and transcript',
    url: 'https://www.archives.gov/milestone-documents/emancipation-proclamation',
    evidenceType: 'Primary presidential proclamation with archival context',
    section: 'January 1, 1863 transcript: designated areas, exceptions, armed service',
    supports: 'Geographic limits, military authority, recognition of freedom and admission to armed service.',
    limitation: 'A legal declaration is not a record of when each person gained effective freedom.',
  },
  gettysburg: {
    title: 'Gettysburg — National Park Service battle overview',
    url: 'https://www.nps.gov/gett/learn/historyculture/gettysburg-overview.htm',
    evidenceType: 'Institutional historical synthesis',
    section: 'July 1–3 battle narrative and July 4 retreat',
    supports: 'The historical battle dates, Union defense and Lee’s subsequent retreat.',
    limitation: 'It cannot establish the outcome of a battle with different commanders or orders.',
  },
  jackson: {
    title: 'Stonewall Jackson photograph — Library of Congress object record',
    url: 'https://www.loc.gov/item/2022630551/',
    evidenceType: 'Archival object catalog with historical identification',
    section: 'Summary and subject identification',
    supports: 'Jackson was wounded at Chancellorsville and died May 10, 1863.',
    limitation: 'The catalog identification supplies chronology, not a theory about an alternate Gettysburg.',
  },
  election: {
    title: '1864 Electoral College results — National Archives',
    url: 'https://www.archives.gov/electoral-college/1864',
    evidenceType: 'Official election-results compilation',
    section: 'Result summary and state electoral votes',
    supports: 'Lincoln defeated McClellan, 212 electoral votes to 21.',
    limitation: 'Results alone do not establish why individuals voted or quantify the effect of a single battle.',
  },
  surrender: {
    title: 'Grant’s surrender terms and Lee’s acceptance — April 9, 1865',
    url: 'https://home.nps.gov/apco/learn/historyculture/surrender-documents.htm',
    evidenceType: 'Primary correspondence reproduced and transcribed by NPS',
    section: 'Terms of Surrender; Lee’s acceptance letter',
    supports: 'Surrender of the Army of Northern Virginia, paroles, transfer of public arms and return home subject to conditions.',
    limitation: 'These military terms do not settle every political question or surrender every Confederate army.',
  },
};

export const LEARNING_REFLECTIONS = [
  {
    id: 'sumter-evacuation',
    title: 'A lost fort and a rallying cause',
    scenarioIds: ['fort_sumter', 'radical_republican_crisis'],
    history: 'Anderson accepted evacuation terms on April 13, 1861. His garrison left the fort on April 14 with military honors; it later received a cheering welcome in New York. Losing the fort and rallying support for the Union could happen together.',
    simulation: 'Your resource changes and cabinet branch are game assumptions. New campaigns model a morale rise after the historical evacuation choice; legacy campaigns retain the older penalty. Neither number measures public opinion in 1861. Escape and prolonged resistance branches imagine different decisions.',
    prompt: 'Imagine the same damaged fort could hold for another day, but no supplies could arrive. What evidence would make that delay worth the danger to the garrison? Explain separately its military value and its possible political effect.',
    reasoningGuide: 'Consider whether the delay changes a relief operation, preserves people or changes what observers learn. A dramatic defense might influence opinion without improving the military position. Ask what the commander could know at the time; do not treat your game score as evidence of public reaction.',
    sourceIds: ['sumter'],
  },
  {
    id: 'emancipation-scope',
    title: 'A proclamation needs the means to carry it out',
    scenarioIds: ['emancipation_cabinet_debate'],
    history: 'The January 1, 1863 proclamation declared freedom in designated areas in rebellion, with explicit exceptions. It did not abolish slavery throughout the United States. It also authorized receiving Black people into Union armed service. Enslaved people had already acted to secure their own freedom.',
    simulation: 'This cabinet decision compresses a longer struggle into resource and political effects. Recruitment totals, diplomatic reactions and the timing of effective freedom cannot be read directly from a single game meter.',
    prompt: 'Two communities hear the proclamation: one is in a designated area behind Confederate lines, the other in a loyal slaveholding border state. Why might their legal position and immediate options differ? What would you need to learn before predicting what happens next?',
    reasoningGuide: 'Check the document’s geographic scope first, then ask who controls the ground and what people can do to secure freedom. Legal authority, military enforcement and individual action interact. Do not assume that hearing the announcement made everyone free in practice that day.',
    sourceIds: ['emancipation'],
  },
  {
    id: 'gettysburg-counterfactual',
    title: 'Changing a commander does not prove an outcome',
    scenarioIds: ['gettysburg_decision', 'gettysburg_with_jackson', 'gettysburg_recognition_crisis'],
    history: 'Union forces held after the July 1–3, 1863 battle, and Lee began retreating on July 4. Jackson had died on May 10. His presence at Gettysburg in this game is therefore a counterfactual premise.',
    simulation: 'The engine explores how different orders, command relationships and resources might matter. A game victory does not establish that Jackson would have won Gettysburg, or that victory would automatically have secured foreign recognition.',
    prompt: 'Suppose an attack succeeds but the army cannot resupply before the opponent recovers. What additional evidence would you need before calling this a campaign victory? Which of your conclusions depend on the game’s assumptions?',
    reasoningGuide: 'Separate holding ground from sustaining an army and obtaining a political result. Examine losses, routes, supplies, the opponent’s remaining forces and diplomatic choices. State what changed in the counterfactual and what remains unknown.',
    sourceIds: ['gettysburg', 'jackson'],
  },
  {
    id: 'election-contingency',
    title: 'Battlefield news and an election are different evidence',
    scenarioIds: ['election_1864_lincoln', 'election_1864_mcclellan'],
    history: 'Lincoln won the 1864 presidential election with 212 electoral votes; McClellan received 21. These are electoral votes, not the popular-vote margin. The alternate McClellan victory in this campaign did not occur.',
    simulation: 'The election branch summarizes political pressure through campaign conditions. It does not simulate individual voters, state election systems or the full set of party and military influences. A proposed armistice in a branch is not proof of an inevitable peace settlement.',
    prompt: 'Imagine the military news stays the same but turnout and party organization change in several close states. Why could the national outcome change? What evidence would test the claim that one battle alone decided the election?',
    reasoningGuide: 'Compare state results, turnout, public arguments and the timing of military news. Distinguish a plausible influence from a sufficient cause. The final electoral total describes the outcome; by itself it does not explain each voter’s reasons.',
    sourceIds: ['election'],
  },
  {
    id: 'surrender-and-settlement',
    title: 'An army’s surrender is not a complete peace settlement',
    scenarioIds: ['appomattox_decision', 'greensboro_convention', 'southern_independence_1864'],
    history: 'Grant’s April 9, 1865 terms covered Lee’s Army of Northern Virginia. Public arms were to be surrendered; officers and men could return home under parole and legal conditions. The agreement did not itself settle every question of reunion or bind every Confederate army.',
    simulation: 'The game’s conventions, recognition and conditional-reunion endings model wider political bargains. Their promises are counterfactual assumptions, not provisions of the historical Appomattox agreement.',
    prompt: 'A commander offers to lay down arms if another leader promises a constitutional change. Which parts can those negotiators carry out themselves, and which require other institutions or armies to agree? How would you distinguish a promise from an enforceable settlement?',
    reasoningGuide: 'Identify who controls the troops, who can issue paroles and who holds constitutional authority. Read the scope and conditions of an agreement before extending it to other people. Compare immediate military relief with unresolved political and civilian consequences.',
    sourceIds: ['surrender'],
  },
];

/** Returns null outside the deliberately limited set of reviewed hinges. */
export function getLearningReflection(scenarioId) {
  if (typeof scenarioId !== 'string') return null;
  return LEARNING_REFLECTIONS.find((reflection) => reflection.scenarioIds.includes(scenarioId)) || null;
}
