// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Range, Position, DiagnosticSeverity, Diagnostic } from 'vscode-languageserver-types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity as LGDiagnosticSeverity } from 'botbuilder-lg';
import { Diagnostic as BFDiagnostic, LgFile } from '@bfc/shared';
import { parser } from '@microsoft/bf-lu/lib/parser';
import { offsetRange } from '@bfc/indexers';

const { parseFile } = parser;

// state should map to tokenizer state
export enum LGCursorState {
  ROOT = 'root',
  TEMPLATENAME = 'template_name',
  TEMPLATEBODY = 'template_body',
  COMMENTS = 'comments',
  FENCEBLOCK = 'fence_block',
  EXPRESSION = 'expression',
  STRUCTURELG = 'structure_lg',
  SINGLE = 'single',
  DOUBLE = 'double',
}

export interface LGOption {
  projectId: string;
  fileId: string;
  templateId: string;
}

export interface Template {
  name: string;
  parameters?: string[];
  body: string;
}

export interface LGDocument {
  uri: string;
  projectId?: string;
  fileId?: string;
  templateId?: string;
  index: () => Promise<LgFile>;
}

export type LGFileResolver = (id: string) => LgFile | undefined;

export function getRangeAtPosition(document: TextDocument, position: Position): Range | undefined {
  const text = document.getText();
  const line = position.line;
  const pos = position.character;
  const lineText = text.split(/\r?\n/g)[line];
  let match: RegExpMatchArray | null;
  const wordDefinition = /[a-zA-Z0-9_/.-]+/g;
  while ((match = wordDefinition.exec(lineText))) {
    const matchIndex = match.index || 0;
    if (matchIndex > pos) {
      return undefined;
    } else if (wordDefinition.lastIndex >= pos) {
      return Range.create(line, matchIndex, line, wordDefinition.lastIndex);
    }
  }

  return undefined;
}

export function getEntityRangeAtPosition(document: TextDocument, position: Position): Range | undefined {
  const text = document.getText();
  const line = position.line;
  const pos = position.character;
  const lineText = text.split(/\r?\n/g)[line];
  let match: RegExpMatchArray | null;
  const wordDefinition = /[a-zA-Z0-9@]+/g;
  while ((match = wordDefinition.exec(lineText))) {
    const matchIndex = match.index || 0;
    if (matchIndex > pos) {
      return undefined;
    } else if (wordDefinition.lastIndex >= pos) {
      return Range.create(line, matchIndex, line, wordDefinition.lastIndex);
    }
  }

  return undefined;
}

const severityMap = {
  [LGDiagnosticSeverity.Error]: DiagnosticSeverity.Error,
  [LGDiagnosticSeverity.Hint]: DiagnosticSeverity.Hint,
  [LGDiagnosticSeverity.Information]: DiagnosticSeverity.Information,
  [LGDiagnosticSeverity.Warning]: DiagnosticSeverity.Warning,
};

export function convertSeverity(severity: LGDiagnosticSeverity): DiagnosticSeverity {
  return severityMap[severity];
}

export function generateDiagnostic(message: string, severity: DiagnosticSeverity, document: TextDocument): Diagnostic {
  return {
    severity,
    range: Range.create(Position.create(0, 0), Position.create(0, 0)),
    message,
    source: document.uri,
  };
}

// if template, offset +1 to exclude #TemplateName
export function convertDiagnostics(lgDiags: BFDiagnostic[] = [], document: TextDocument, offset = 0): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const defaultRange = Range.create(Position.create(0, 0), Position.create(0, 0));
  lgDiags.forEach((diag) => {
    // offset +1, lsp start from line:0, but monaco/composer start from line:1
    const range = diag.range ? offsetRange(diag.range, 1 + offset) : defaultRange;
    const diagnostic: Diagnostic = {
      severity: convertSeverity(diag.severity),
      range,
      message: diag.message,
      source: document.uri,
    };

    //exclude the warning of no template definition.
    if (!diagnostic.message.includes('LG file must have at least one template definition.')) {
      diagnostics.push(diagnostic);
    }
  });

  return diagnostics;
}

export const cardTypes = [
  'Typing',
  'Suggestions',
  'HeroCard',
  'SigninCard',
  'ThumbnailCard',
  'AudioCard',
  'VideoCard',
  'AnimationCard',
  'MediaCard',
  'OAuthCard',
  'Attachment',
  'AttachmentLayout',
  'CardAction',
  'AdaptiveCard',
  'Activity',
];

export const cardPropPossibleValueType = {
  title: 'An Example Card',
  type: 'Action Type',
  value: 'Some Value',
  SuggestionActions: 'Text | ${Some_CardAction}',
  subtitle: 'An Example Subtitle',
  text: 'Some text',
  image: 'https://example.com/demo.jpg',
  buttons: 'Text | ${Some_CardAction}',
  contenttype: 'adaptivecard',
  content: '${json(fromFile("../../card.json"))}',
  name: 'An Example Name',

  Text: 'Text | ${Expression}',
  Speak: 'Text | ${Expression}',
  Attachments: 'List of attachments',
  InputHint: 'accepting | ignoring | expecting',
  AttachmentLayout: 'list | carousel',
  SuggestedActions: 'Text | ${Expression}',
};

export const cardPropDict = {
  CardAction: ['title', 'type', 'value'],
  Suggestions: ['SuggestionActions'],
  Cards: ['title', 'subtitle', 'text', 'image', 'buttons'],
  Attachment: ['contenttype', 'content'],
  Activity: ['Text', 'Speak', 'Attachments', 'SuggestedActions', 'InputHint', 'AttachmentLayout'],
  Others: ['type', 'name', 'value'],
};

export async function extractLUISContent(text: string): Promise<any> {
  let parsedContent: any;
  const log = false;
  const locale = 'en-us';
  try {
    parsedContent = await parseFile(text, log, locale);
  } catch (e) {
    // nothing to do in catch block
  }

  if (parsedContent !== undefined) {
    return Promise.resolve(parsedContent.LUISJsonStructure);
  } else {
    return undefined;
  }
}

export function getSuggestionEntities(luisJson: any, suggestionEntityTypes: string[]): string[] {
  const suggestionEntityList: string[] = [];
  if (luisJson !== undefined) {
    suggestionEntityTypes.forEach((entityType) => {
      if (luisJson[entityType] !== undefined && luisJson[entityType].length > 0) {
        luisJson[entityType].forEach((entity) => {
          if (entity?.name) {
            suggestionEntityList.push(entity.name);
          }
        });
      }
    });
  }

  return suggestionEntityList;
}

export const suggestionAllEntityTypes = [
  'entities',
  'regex_entities',
  'patternAnyEntities',
  'preBuiltEntities',
  'closedLists',
  'phraseLists',
  'composites',
];

export function getLineByIndex(document: TextDocument, line: number) {
  const lineCount = document.lineCount;
  if (line >= lineCount || line < 0) return null;

  return document.getText().split(/\r?\n/g)[line];
}
