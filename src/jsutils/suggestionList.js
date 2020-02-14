// @flow strict

/**
 * Given an invalid input string and a list of valid options, returns a filtered
 * list of valid options sorted based on their similarity with the input.
 */
export default function suggestionList(
  input: string,
  options: $ReadOnlyArray<string>,
): Array<string> {
  const optionsByDistance = Object.create(null);
  const lexicalDistance = new LexicalDistance(input);

  const inputThreshold = input.length / 2;
  for (const option of options) {
    const distance = lexicalDistance.measure(option);
    const threshold = Math.max(inputThreshold, option.length / 2, 1);
    if (distance <= threshold) {
      optionsByDistance[option] = distance;
    }
  }
  return Object.keys(optionsByDistance).sort((a, b) => {
    const distanceDiff = optionsByDistance[a] - optionsByDistance[b];
    return distanceDiff !== 0 ? distanceDiff : a.localeCompare(b);
  });
}

/**
 * Computes the lexical distance between strings A and B.
 *
 * The "distance" between two strings is given by counting the minimum number
 * of edits needed to transform string A into string B. An edit can be an
 * insertion, deletion, or substitution of a single character, or a swap of two
 * adjacent characters.
 *
 * Includes a custom alteration from Damerau-Levenshtein to treat case changes
 * as a single edit which helps identify mis-cased values with an edit distance
 * of 1.
 *
 * This distance can be useful for detecting typos in input or sorting
 */
class LexicalDistance {
  _input: string;
  _inputLowerCase: string;
  _rows: [Array<number>, Array<number>, Array<number>];

  constructor(input: string) {
    this._input = input;
    this._inputLowerCase = input.toLowerCase();

    this._rows = [
      new Array(input.length + 1).fill(0),
      new Array(input.length + 1).fill(0),
      new Array(input.length + 1).fill(0),
    ];
  }

  measure(option: string): number {
    if (this._input === option) {
      return 0;
    }

    const optionLowerCase = option.toLowerCase();

    // Any case change counts as a single edit
    if (this._inputLowerCase === optionLowerCase) {
      return 1;
    }

    const a = optionLowerCase;
    const b = this._inputLowerCase;
    const aLength = a.length;
    const bLength = b.length;

    const rows = this._rows;
    for (let j = 0; j <= bLength; j++) {
      rows[0][j] = j;
    }

    for (let i = 1; i <= aLength; i++) {
      const upRow = rows[(i - 1) % 3];
      const currentRow = rows[i % 3];

      currentRow[0] = i;
      for (let j = 1; j <= bLength; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        let currentCell = Math.min(
          upRow[j] + 1, // delete
          currentRow[j - 1] + 1, // insert
          upRow[j - 1] + cost, // substitute
        );

        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          // transposition
          const doubleDiagonalCell = rows[(i - 2) % 3][j - 2];
          currentCell = Math.min(currentCell, doubleDiagonalCell + 1);
        }

        currentRow[j] = currentCell;
      }
    }

    return rows[aLength % 3][bLength];
  }
}
