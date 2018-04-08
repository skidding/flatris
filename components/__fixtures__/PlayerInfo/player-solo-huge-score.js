// @flow

import { createFixture } from 'react-cosmos-flow/fixture';
import { getBlankPlayer } from '../../../reducers/game';
import PlayerInfo from '../../PlayerInfo';

const user = { id: 'mock', name: 'Treznik' };
const player = {
  ...getBlankPlayer('mock', user),
  score: 1442387,
  lines: 226
};

export default createFixture({
  component: PlayerInfo,

  container: {
    width: 4,
    height: 4
  },

  props: {
    player,
    wins: null,
    isPlayer1: true,
    showReadyState: false
  }
});
