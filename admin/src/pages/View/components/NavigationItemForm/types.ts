import { Audience, NavigationItemAdditionalField, NavigationItemType, PluginConfigNameFields, ToBeFixed } from '../../../../../../types';
import { Id } from 'strapi-typed';

export type NavigationItemFormData = {
  isMenuAllowedLevel: boolean,
  levelPath: string,
  parentAttachedToMenu: boolean
  audience?: Audience[],
  collapsed?: boolean,
  externalPath?: string | null,
  id?: Id,
  isParentAttachedToMenu?: boolean,
  items?: ToBeFixed[],
  menuAttached?: boolean,
  order?: number,
  parent?: ToBeFixed,
  path?: string | null,
  title?: string,
  type?: NavigationItemType,
  uiRouterKey?: string,
  updated?: boolean,
  viewId?: string,
  viewParentId: string | null, 
  related?: {
      value: string,
      label: string
  },
  relatedType?: {
    value: string,
    label: string
  },
  relatedRef?: ToBeFixed,
}

export type NavigationItemFormProps = {
  additionalFields: NavigationItemAdditionalField[];
  appendLabelPublicationStatus: (label: string, entity: ToBeFixed) => string; // TODO: Content type entity type
  availableAudience: string[];
  contentTypeEntities: ToBeFixed[]; // TODO: Type this pls
  contentTypes: ToBeFixed[]; // TODO: Type this pls
  contentTypesNameFields: PluginConfigNameFields;
  data: NavigationItemFormData;
  getContentTypeEntities: (value: {modelUID: string, query: ContentTypeSearchQuery, locale: ToBeFixed}, plugin: string) => ToBeFixed // TODO: Type this pls
  inputsPrefix: string;
  isLoading: boolean;
  locale: ToBeFixed;
  onCancel: () => ToBeFixed; // TODO: Type this pls
  onSubmit: (payload: SanitizedFormPayload) => void;
  usedContentTypeEntities: ToBeFixed[]; // TODO: Type this pls
  usedContentTypesData: ToBeFixed; // TODO: Type this pls
}

export type ContentTypeSearchQuery = ToBeFixed;
export type RawFormPayload = {
  type: NavigationItemType;
  related: string;
  relatedType: string;
  audience: Id[];
  menuAttached: boolean;
  title: string;
  externalPath: string | null;
  path: string | null;
  additionalFields: Record<string, string | boolean | string[]> // { cf_name: cf_value }
}

export type SanitizedFormPayload = {
  title: string;
  type: NavigationItemType;
  menuAttached: boolean;
  path?: string | null;
  externalPath?: string | null;
  related: Id | undefined;
  relatedType: string | undefined;
  isSingle: boolean;
  singleRelatedItem: ToBeFixed; // TODO: This is contentTypeEntity type or undefined
  uiRouterKey: string | undefined;
}