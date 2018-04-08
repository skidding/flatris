// @flow

import { createFixture } from 'react-cosmos-flow/fixture';
import { getSampleUser } from '../../../../utils/test-helpers';
import { getBlankPlayer } from '../../../../reducers/game';
import Flash from '../../../effects/Flash';

const user = getSampleUser();
const player = {
  ...getBlankPlayer('dce6b11e', user),
  flashYay: 'a'
};

export default createFixture({
  component: Flash,
  props: {
    player,
    children: `D'oh!`
  }
});
