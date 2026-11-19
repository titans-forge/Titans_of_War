const STONE_HOUSE = {
  id: 'stone-house', kind: 'Landmark', name: 'Stone House', x: 1210, y: 401, width: 142, height: 122,
  labelOffsetY: -78, scenic: true, src: 'images/battles/landmarks-v5/stone-house.png',
  note: 'The Stone House stood northeast of the crossroads and sheltered wounded soldiers during both battles. Pope’s headquarters were on nearby Buck Hill. This reconstruction uses a compressed battlefield placement.',
  source: 'https://home.nps.gov/mana/learn/historyculture/the-stone-house.htm',
};

const DOGAN_HOUSE = {
  id: 'lucinda-dogan-house', kind: 'Landmark', name: 'Lucinda Dogan House', x: 457, y: 424, width: 116, height: 89,
  labelOffsetY: -53, scenic: true, src: 'images/battles/landmarks-second-manassas-v1/lucinda-dogan-house.webp',
  note: 'Lucinda Dogan’s home stood near the Groveton crossroads and was damaged during the battle. It is the only surviving original building from the village. This reconstruction uses a compressed battlefield placement.',
  source: 'https://www.nps.gov/places/000/lucinda-dogan-house.htm',
};

export const SECOND_MANASSAS_HOUSES = Object.freeze([STONE_HOUSE, DOGAN_HOUSE]);

export function secondManassasSites(field) {
  const cut = field?.zones.find(zone => zone.name === 'Unfinished Railroad · Deep Cut');
  const pike = field?.zones.find(zone => zone.name === 'Warrenton Turnpike');
  if (!cut || !pike) return [];
  return [
    ...SECOND_MANASSAS_HOUSES,
    {
      id: 'unfinished-railroad-cut', kind: 'Terrain', name: 'Unfinished railroad cut',
      x: 690, y: 224, width: 184, height: 116, labelOffsetY: -64, scenic: true,
      note: 'The Manassas Gap Railroad graded this route but ran out of money before laying track. The abandoned cut gave Jackson’s infantry ready-made cover.',
      source: 'https://www.nps.gov/places/information-panel-unfinished-railroad.htm',
    },
    {
      id: 'warrenton-turnpike', kind: 'Terrain', name: 'Warrenton Turnpike',
      x: 855, y: (pike.top + pike.bottom) / 2, width: 175, height: 68, labelOffsetY: 23, scenic: true,
      note: 'The wartime turnpike linked Groveton to the Sudley Road crossroads and roughly follows today’s US 29.',
      source: 'https://www.nps.gov/thingstodo/second-manassas-trail.htm',
    },
  ];
}
