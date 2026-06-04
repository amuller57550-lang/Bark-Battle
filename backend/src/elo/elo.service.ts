import { Injectable } from '@nestjs/common';

const K_FACTOR = 32;
const BASE_WIN_RP = 20;
const BASE_LOSS_RP = -15;

@Injectable()
export class EloService {
  /**
   * Calculate expected win probability for player A vs player B
   */
  expectedScore(rpA: number, rpB: number): number {
    return 1 / (1 + Math.pow(10, (rpB - rpA) / 400));
  }

  /**
   * Calculate new RP values after a match.
   * Returns { winner: rpChange, loser: rpChange }
   */
  calculateRpChanges(
    winnerRP: number,
    loserRP: number,
    isDraw = false,
  ): { winnerChange: number; loserChange: number } {
    const expectedWin = this.expectedScore(winnerRP, loserRP);
    const rpDiff = Math.abs(winnerRP - loserRP);

    if (isDraw) {
      const drawChange = Math.round(K_FACTOR * (0.5 - expectedWin));
      return { winnerChange: drawChange, loserChange: -drawChange };
    }

    // Base RP change clamped to reasonable range
    const winChange = Math.max(
      BASE_WIN_RP - 5,
      Math.min(
        BASE_WIN_RP + 15,
        Math.round(K_FACTOR * (1 - expectedWin)),
      ),
    );

    // Upset bonus: beating a much stronger opponent
    const upsetBonus = loserRP > winnerRP + 300 ? 10 : 0;

    // Loss penalty scaled by RP difference
    const lossChange = Math.max(
      BASE_LOSS_RP - 10,
      Math.min(
        BASE_LOSS_RP + 5,
        -Math.round(K_FACTOR * expectedWin),
      ),
    );

    return {
      winnerChange: winChange + upsetBonus,
      loserChange: lossChange,
    };
  }

  /**
   * Check if a rematch is valid (anti-farming: same pair more than 3x in 1h)
   */
  isValidMatchup(recentMatchCount: number): boolean {
    return recentMatchCount < 3;
  }
}
