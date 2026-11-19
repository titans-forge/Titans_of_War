import { insideObjective } from './objectiveControl.js';

const advice = (short, text, sector) => ({ short, text, locationId: `Sector:${sector.id}`, locationLabel: sector.name });
const ordered = (unit, order) => unit?.order === order || unit?.pendingCommand?.order === order;
const moving = unit => unit?.directMove || ordered(unit, 'move') || ordered(unit, 'assault');
const withdrawing = unit => unit?.withdrawn || ordered(unit, 'withdraw');

function place(unit, name, sector, instruction, placement = sector) {
  if (!unit?.active) return advice(`${name} is off the field`, `The objective still requires ${name}. Check the roster for the formation’s status.`, sector);
  const destination = unit.pendingCommand?.point || unit.target;
  if (ordered(unit, 'assault') || (moving(unit) && destination && insideObjective(destination, placement))) {
    return advice(`Let ${name} arrive`, `Let the formation finish its order and settle at ${sector.name}.`, sector);
  }
  if (!insideObjective(unit, placement) || moving(unit)) return advice(`Move ${name}`, instruction, sector);
  if (!ordered(unit, 'hold') || unit.pendingCommand) return advice(`Hold ${name} in place`, `Keep ${name} at ${sector.name} and give the formation time to settle.`, sector);
  return null;
}

function kennesaw(mission, unit, sector, withdrawal, field) {
  const angle = sector('center'), road = sector('right');
  const guns = unit('kennesaw-mebane');
  if (withdrawal && !mission.gunsReachedRoad) {
    const staging = field.zones.find(zone => zone.kind === 'road');
    const placement = { x: (staging.left + staging.right) / 2, y: (staging.top + staging.bottom) / 2,
      width: staging.right - staging.left, height: staging.bottom - staging.top };
    return place(guns, 'Mebane’s battery', road, 'Move Mebane’s battery to the center of the Southern Road. Keep Maney and Vaughan at the Dead Angle.', placement)
      || advice('Wait for the guns to stage', 'Keep the battery inside the Southern Road sector until the staging check is met.', road);
  }
  if (!withdrawal || mission.held < 6) {
    return place(unit('kennesaw-vaughan'), 'Vaughan', angle, 'Move Vaughan beside Maney in the Dead Angle sector.')
      || place(unit('kennesaw-maney'), 'Maney', angle, 'Keep Maney with Vaughan, inside the Dead Angle works.')
      || advice('Hold the Dead Angle', `Keep both brigades inside the works through Union contact. The hold needs ${withdrawal ? 6 : 9} uninterrupted field minutes.`, angle);
  }
  if (!mission.gunsLeading) {
    return withdrawing(guns)
      ? advice('Keep the rear guard in place', 'Wait until the battery begins its covered withdrawal. Keep both brigades at the Dead Angle until the screen is confirmed.', angle)
      : advice('Withdraw Mebane first', 'The screen has held. Order Mebane’s battery to Withdraw while Maney and Vaughan stay in place.', road);
  }
  const remaining = [['kennesaw-maney', 'Maney'], ['kennesaw-vaughan', 'Vaughan']].find(([id]) => !withdrawing(unit(id)));
  return remaining
    ? advice(`Withdraw ${remaining[1]}`, 'The guns are moving out. Order both covering brigades to Withdraw through the rear exits.', road)
    : advice('Watch the rear exits', 'Let the guns and both brigades reach the exits. Keep at least 65% of starting strength organized.', road);
}

function vicksburg(mission, unit, sector, fallback) {
  const redoubt = sector('center'), interior = sector('left');
  const alabama = unit('vicksburg-alabama'), waul = unit('vicksburg-waul'), guns = unit('vicksburg-battery');
  if (!fallback) {
    if (!mission.breachClear && !moving(waul)) {
      return advice('Assault with Waul', 'Select Waul, set the Assault sector to Railroad Redoubt, and order Assault. Keep the 30th Alabama in support.', redoubt);
    }
    return place(waul, 'Waul', redoubt, 'Move Waul inside the Railroad Redoubt to support the 30th Alabama.')
      || place(alabama, 'the 30th Alabama', redoubt, 'Move the 30th Alabama inside the redoubt to support Waul.')
      || advice('Hold the redoubt', 'Keep both formations in the redoubt. The eight-minute hold counts once the breach is clear and Carr’s infantry makes contact.', redoubt);
  }
  if (!mission.gunsReady) {
    return place(guns, 'the field guns', interior, 'Move the field guns into the lower half of the Interior Line. Keep the 30th Alabama at the redoubt.')
      || advice('Wait for the guns to deploy', 'Keep the 30th Alabama at the redoubt while the guns deploy inside the Interior Line.', interior);
  }
  if (!mission.screened) {
    return advice('Restore the redoubt screen', 'Keep the 30th Alabama holding inside the redoubt under fire, then redeploy the guns at the Interior Line.', redoubt);
  }
  return place(alabama, 'the 30th Alabama', interior, 'The guns are deployed under cover. Move the 30th Alabama into the upper half of the Interior Line beside Waul.')
    || place(waul, 'Waul', interior, 'Move Waul beside the 30th Alabama on the Interior Line.')
    || advice('Hold the Interior Line', 'Keep both infantry formations and the guns together on the Interior Line for six uninterrupted field minutes.', interior);
}

function sailorsCreek(mission, unit, sector, withdrawal) {
  const bank = sector('center'), aid = sector('right'), road = sector('left');
  const lee = unit('sailors-lee'), escort = unit('sailors-escort'), kershaw = unit('sailors-kershaw');
  if (!withdrawal) {
    return place(kershaw, 'Kershaw', bank, 'Move Kershaw into the South Bank sector beside Custis Lee.')
      || place(lee, 'Custis Lee', bank, 'Keep Custis Lee with Kershaw on the South Bank.')
      || place(escort, 'the casualty escort', aid, 'Move the casualty escort into the Aid Staging sector and let it settle.')
      || advice('Hold the aid route', 'Keep both sectors clear with the escort in place. The aid window requires eight uninterrupted field minutes under the screen.', aid);
  }
  if (mission.screened) {
    return withdrawing(kershaw)
      ? advice('Watch the rear guard exit', 'Let Kershaw clear the western exits. The force needs at least 65% of its starting strength to leave in order.', road)
      : advice('Withdraw Kershaw', 'The lead column is clear. Order Kershaw to Withdraw through the western exits.', road);
  }
  if (!withdrawing(lee)) return advice('Withdraw Custis Lee first', 'Order Custis Lee to Withdraw toward the West Road. Keep Kershaw on the South Bank.', road);
  if (!withdrawing(escort)) return advice('Withdraw the casualty escort', 'Order the casualty escort to Withdraw behind Custis Lee. Keep Kershaw on the South Bank until both exit.', road);
  return place(kershaw, 'Kershaw', bank, 'Keep Kershaw in the South Bank sector until Custis Lee and the escort have cleared the western exits.')
    || advice('Keep Kershaw on the bank', 'Let the lead column reach the exits while Kershaw holds the South Bank under fire. Wait for the screen to be confirmed.', bank);
}

const guides = {
  kennesaw_mountain: ['kennesaw', kennesaw],
  vicksburg: ['vicksburg', vicksburg],
  sailors_creek: ['sailorsCreek', sailorsCreek],
};

export function fieldOrderGuidance(snapshot, choiceId) {
  const guide = Object.hasOwn(guides, snapshot?.scenarioId) && guides[snapshot.scenarioId];
  if (!guide || !['option_a', 'option_b'].includes(choiceId) || snapshot.resolving || snapshot.outcome !== 'undecided') return null;
  const [missionKey, describe] = guide;
  const field = snapshot.fieldBattle;
  const mission = field?.[missionKey];
  if (mission?.status !== 'tracking' || !field.sectors?.length || !snapshot.formations?.length) return null;
  return describe(mission, id => snapshot.formations.find(unit => unit.id === id),
    id => field.sectors.find(sector => sector.id === id), choiceId === 'option_b', field);
}
