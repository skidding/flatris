// @flow

import { createFixture } from 'react-cosmos-flow/fixture';
import FlatrisIntro from '../../FlatrisIntro';

export default createFixture({
  component: FlatrisIntro,

  props: {
    onNext: () => console.log('Next')
  },

  container: {
    width: 10,
    backgroundColor: 'rgba(236, 240, 241, 0.85)'
  }
});
