// ============================================================
// frootze — Family Stats Calculator
// Generates fun stats from the family tree data
// ============================================================

export function calculateFamilyStats(relationships, currentUser) {
  const total = relationships.length;
  const verified = relationships.filter(r => r.verification_status === 'verified').length;

  // Generation count
  const genMap = {
    'past-2': ['grandfather_paternal','grandmother_paternal','grandfather_maternal','grandmother_maternal'],
    'past-1': ['father','mother','uncle_elder','uncle_younger','aunt_paternal','aunt_maternal','uncle_maternal','father_in_law','mother_in_law'],
    'current': ['spouse','brother','sister','brother_in_law','sister_in_law','co_brother','cousin_male','cousin_female'],
    'future-1': ['son','daughter'],
    'future-2': ['grandson','granddaughter'],
  };

  const usedGens = new Set(['current']);
  relationships.forEach(rel => {
    for (const [gen, types] of Object.entries(genMap)) {
      if (types.includes(rel.relation_type)) usedGens.add(gen);
    }
  });

  const genCount = usedGens.size;

  // Oldest generation
  let oldestGen = 'current';
  if (usedGens.has('past-2')) oldestGen = 'past-2';
  else if (usedGens.has('past-1')) oldestGen = 'past-1';

  const oldestGenLabel = {
    'past-2': 'Grandparents (தாத்தா/பாட்டி)',
    'past-1': 'Parents (அப்பா/அம்மா)',
    'current': 'Your Generation',
  }[oldestGen];

  // Youngest generation
  let youngestGen = 'current';
  if (usedGens.has('future-2')) youngestGen = 'future-2';
  else if (usedGens.has('future-1')) youngestGen = 'future-1';

  // Photos uploaded
  const withPhotos = relationships.filter(r => r.to_user?.profile_photo).length +
    (currentUser?.profile_photo ? 1 : 0);
  const totalNodes = total + 1;

  // Relation counts
  const counts = {};
  relationships.forEach(rel => {
    counts[rel.relation_type] = (counts[rel.relation_type] || 0) + 1;
  });

  // Fun facts
  const facts = [];

  if (genCount >= 3) facts.push(`${genCount} தலைமுறைகள் / ${genCount} generations connected`);
  if (counts.brother || counts.sister) {
    const sibCount = (counts.brother || 0) + (counts.sister || 0);
    facts.push(`${sibCount} உடன்பிறந்தவர்கள் / ${sibCount} siblings`);
  }
  if (counts.son || counts.daughter) {
    const childCount = (counts.son || 0) + (counts.daughter || 0);
    facts.push(`${childCount} பிள்ளைகள் / ${childCount} children`);
  }
  if (verified === total && total > 0) {
    facts.push('அனைத்தும் சரிபார்க்கப்பட்டது! / 100% verified!');
  }
  if (withPhotos === totalNodes && totalNodes > 1) {
    facts.push('அனைவரும் புகைப்படம் சேர்த்துள்ளனர்! / Everyone has a photo!');
  }

  return {
    total,
    verified,
    pending: total - verified,
    genCount,
    oldestGenLabel,
    youngestGen,
    withPhotos,
    totalNodes,
    facts,
    counts,
  };
}
