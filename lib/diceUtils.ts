'use client';

// Mapeamento de termos populares de perícias / atributos do Tormenta20 / D&D
const HAB_MAP: Record<string, string> = {
  iniciativa: 'Iniciativa',
  furtividade: 'Furtividade',
  persuasao: 'Persuasão',
  persuasão: 'Persuasão',
  luta: 'Luta',
  pontaria: 'Pontaria',
  misticismo: 'Misticismo',
  percepcao: 'Percepção',
  percepção: 'Percepção',
  atletismo: 'Atletismo',
  acrobacia: 'Acrobacia',
  fortitude: 'Fortitude',
  reflexos: 'Reflexos',
  vontade: 'Vontade',
  enganacao: 'Enganação',
  enganação: 'Enganação',
  diplomacia: 'Diplomacia',
  intuicao: 'Intuição',
  intuição: 'Intuição',
  investigacao: 'Investigação',
  investigação: 'Investigação',
  cura: 'Cura',
  sobrevivencia: 'Sobrevivência',
  sobrevivência: 'Sobrevivência',
  forca: 'Força',
  força: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  constituição: 'Constituição',
  inteligencia: 'Inteligência',
  inteligência: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  ataque: 'Ataque',
  d20: 'D20',
  d6: 'D6',
  d100: 'D100',
};

/**
 * Procura por hashtags do tipo #furtividade, #iniciativa, #d20 no texto e executa
 * a rolagem automática de dados com bônus se houver ficha ativa.
 */
export function processarRolagensComandos(texto: string, fichaJogador?: any): string {
  if (!texto || !texto.includes('#')) return texto;

  // Regex para localizar #palavra (aceita acentos)
  const regex = /#([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9_]+)/g;

  return texto.replace(regex, (match, comandoRaw) => {
    const key = comandoRaw.toLowerCase();
    const nomeAmigavel = HAB_MAP[key] || comandoRaw.charAt(0).toUpperCase() + comandoRaw.slice(1);

    // Caso de rolagem de dados específicos (#d6, #d100, #d10, etc)
    if (key.startsWith('d') && !isNaN(Number(key.slice(1)))) {
      const lados = Number(key.slice(1)) || 20;
      const roll = Math.floor(Math.random() * lados) + 1;
      return `**[🎲 ${nomeAmigavel.toUpperCase()}: ${roll}]**`;
    }

    // Rolagem padrão D20 com bônus de perícia / atributo se disponível
    const d20 = Math.floor(Math.random() * 20) + 1;
    let bonus = 0;

    if (fichaJogador) {
      // Checar se a ficha possui o bônus registrado para essa perícia
      if (fichaJogador.pericias && typeof fichaJogador.pericias === 'object') {
        const periciaObj = fichaJogador.pericias[key] || fichaJogador.pericias[nomeAmigavel] || fichaJogador.pericias[key.toLowerCase()];
        if (typeof periciaObj === 'number') {
          bonus = periciaObj;
        } else if (typeof periciaObj === 'string') {
          bonus = parseInt(periciaObj.replace('+', '')) || 0;
        } else if (periciaObj && typeof periciaObj === 'object') {
          const tot = periciaObj.total ?? periciaObj.bonus ?? periciaObj.outros;
          if (typeof tot === 'number') bonus = tot;
          else if (typeof tot === 'string') bonus = parseInt(tot.replace('+', '')) || 0;
        }
      }

      // Checar se é atributo direto (for, des, con, int, sab, car ou nomes por extenso)
      if (bonus === 0) {
        const attrKey = key.substring(0, 3);
        const mapLongo: Record<string, string> = {
          for: 'forca', des: 'destreza', con: 'constituicao', int: 'inteligencia', sab: 'sabedoria', car: 'carisma'
        };
        const nomeLongo = mapLongo[attrKey] || '';
        const rawAttr = fichaJogador.atributos?.[attrKey] ?? fichaJogador.atributos?.[nomeLongo] ?? fichaJogador[attrKey] ?? fichaJogador[nomeLongo];

        if (typeof rawAttr === 'number') {
          bonus = rawAttr;
        } else if (typeof rawAttr === 'string') {
          bonus = parseInt(rawAttr.replace('+', '')) || 0;
        } else if (rawAttr && typeof rawAttr === 'object') {
          const modField = rawAttr.mod ?? rawAttr.total ?? rawAttr.valor;
          if (typeof modField === 'number') bonus = modField;
          else if (typeof modField === 'string') bonus = parseInt(modField.replace('+', '')) || 0;
          else {
            const base = parseInt(String(rawAttr.base || 0)) || 0;
            const bns = parseInt(String(rawAttr.bonus || 0)) || 0;
            bonus = base + bns;
          }
        }
      }
    }

    const total = d20 + bonus;
    const bonusStr = bonus !== 0 ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : '';
    const d20Highlight = d20 === 20 ? '🔥 CRÍTICO!' : d20 === 1 ? '💀 FALHA CRÍTICA!' : '';

    return `**[🎲 ${nomeAmigavel}: ${total} (d20: ${d20}${bonusStr ? ` ${bonusStr}` : ''}) ${d20Highlight}]**`.trim();
  });
}
