// Based on Clearcasting Implementation done by @Blazyb
import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';
import { formatNumber } from 'common/format';
import { TooltipElement } from 'common/Tooltip';

import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';
import Combatants from 'parser/shared/modules/Combatants';

import AbilityTracker from 'parser/shared/modules/AbilityTracker';

import StatisticBox, { STATISTIC_ORDER } from 'interface/others/StatisticBox';

//const debug = false;

class Vivify extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
    combatants: Combatants,
  };

  remVivifyHealCount = 0;
  remVivifyHealing = 0;
  gustsHealing = 0;
  lastCastTarget = null;
  remDuringManaTea = 0;
  numberToCount = 0;

  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.VIVIFY), this.vivCast);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.VIVIFY), this.handleViv);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.GUSTS_OF_MISTS), this.handleMastery);
  }

  vivCast(event) {
    this.numberToCount += 1;
    this.lastCastTarget = event.targetID;
  }

  handleViv(event) {
    if ((this.lastCastTarget !== event.targetID)) {
      this.remVivifyHealCount += 1;
      this.remVivifyHealing += (event.amount || 0 ) + (event.absorbed || 0);
      if (this.selectedCombatant.hasBuff(SPELLS.MANA_TEA_TALENT.id)) {
        this.remDuringManaTea += 1;
      }
    }
  }

  handleMastery(event){
    if ((this.lastCastTarget === event.targetID) && this.numberToCount > 0) {
      this.gustsHealing += (event.amount || 0) + (event.absorbed || 0);
      this.numberToCount -= 1;
    }
  }

  get averageRemPerVivify() {
    const vivifyCasts = this.abilityTracker.getAbility(SPELLS.VIVIFY.id).casts || 0;

    return this.remVivifyHealCount / vivifyCasts || 0;
  }

  get suggestionThresholds() {
    return {
      actual: this.averageRemPerVivify,
      isLessThan: {
        minor: 1.75,
        average: 1.25,
        major: 0.75,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) => {
        return suggest(
          <>
            You are casting <SpellLink id={SPELLS.VIVIFY.id} /> with less than 2 <SpellLink id={SPELLS.RENEWING_MIST.id} /> out on the raid. To ensure you are gaining the maximum <SpellLink id={SPELLS.VIVIFY.id} /> healing, keep <SpellLink id={SPELLS.RENEWING_MIST.id} /> on cooldown.
          </>,
        )
          .icon(SPELLS.VIVIFY.icon)
          .actual(`${this.averageRemPerVivify.toFixed(2)} Renewing Mists per Vivify`)
          .recommended(`${recommended} Renewing Mists are recommended per Vivify`);
      });
  }

  statistic() {
    return (
      <StatisticBox
        postion={STATISTIC_ORDER.CORE(15)}
        icon={<SpellIcon id={SPELLS.VIVIFY.id} />}
        value={`${this.averageRemPerVivify.toFixed(2)}`}
        label={(
          <TooltipElement
            content={(
              <>
                Healing Breakdown:
                <ul>
                  <li>{formatNumber(this.abilityTracker.getAbility(SPELLS.VIVIFY.id).healingEffective)} overall healing from Vivify.</li>
                  <li>{formatNumber(this.remVivifyHealing)} portion of your Vivify healing to REM targets.</li>
                </ul>
              </>
            )}
          >
            Avg REMs per Cast
          </TooltipElement>
        )}
      />
    );
  }
}

export default Vivify;
