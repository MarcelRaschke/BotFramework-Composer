// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import React from 'react';
import { jsx } from '@emotion/core';
// import { useRecoilValue } from 'recoil';
import formatMessage from 'format-message';
import { ActionButton } from 'office-ui-fabric-react/lib/Button';

import { CollapsableWrapper } from '../../components/CollapsableWrapper';
// import { rootBotProjectIdSelector } from '../../recoilModel/selectors/project';
// import { dispatcherState, settingsState } from '../../recoilModel';

import { titleStyle, sectionHeader, tableRow, tableItem } from './common';

// -------------------- SkillHostEndPoint -------------------- //

type Adapter = {
  name: string;
  type: string;
};

const header = () => (
  <div css={sectionHeader}>
    {formatMessage('Adapters are installed by the package manager. Add adapters to connect your bot to channels.')}
  </div>
);

const addAdapterButton = () => (
  <ActionButton iconProps={{ iconName: 'Add' }}>{formatMessage('Add adapter')}</ActionButton>
);

export const Adapters: React.FC = () => {
  // const rootBotProjectId = useRecoilValue(rootBotProjectIdSelector) ?? '';
  // const { setSettings } = useRecoilValue(dispatcherState);
  //const { adapters } = useRecoilValue(settingsState(rootBotProjectId));
  const adapters: Adapter[] = [
    { name: 'foo12', type: 'Google' },
    { name: 'bar56', type: 'Alexa' },
    { name: 'Test', type: 'Facebook' },
    { name: 'Woohoo', type: 'Emojli' },
  ];

  return (
    <CollapsableWrapper title={formatMessage('Adapters')} titleStyle={titleStyle}>
      {header()}
      {addAdapterButton(/* setSettings */)}
      {adapters.map((p, index) => {
        return (
          <div key={index} css={tableRow}>
            <div css={tableItem} title={p.name}>
              {p.name}
            </div>
            <div css={tableItem} title={p.type}>
              {p.type}
            </div>
          </div>
        );
      })}
    </CollapsableWrapper>
  );
};
