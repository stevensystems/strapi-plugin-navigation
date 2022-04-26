import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { debounce, find, get, first, isEmpty, isEqual, isNil, isString } from 'lodash';
import slugify from 'slugify';
//@ts-ignore
import { Formik } from 'formik';

// Design System
//@ts-ignore
import { ModalBody } from '@strapi/design-system/ModalLayout';
//@ts-ignore
import { Select, Option } from '@strapi/design-system/Select';
//@ts-ignore
import { Grid, GridItem } from '@strapi/design-system/Grid';
//@ts-ignore
import { Form, GenericInput } from '@strapi/helper-plugin';

import { NavigationItemPopupFooter } from '../NavigationItemPopup/NavigationItemPopupFooter';
import { navigationItemType } from '../../utils/enums';
import { extractRelatedItemLabel } from '../../utils/parsers';
import { form as formDefinition } from './utils/form';
import { checkFormValidity } from '../../utils/form';
import { getTradId } from '../../../../translations';
import { getMessage } from '../../../../utils';
import { Audience, NavigationItemAdditionalField, NavigationItemType, PluginConfigNameFields, ToBeFixed } from '../../../../../../types';
import { Id } from 'strapi-typed';

interface NavigationItemFormProps {
  isLoading: boolean;
  inputsPrefix: string;
  data: ToBeFixed; // TODO: Type this pls
  contentTypes: Array<ToBeFixed>; // TODO: Type this pls
  contentTypeEntities: Array<ToBeFixed>; // TODO: Type this pls
  usedContentTypeEntities: Array<ToBeFixed>; // TODO: Type this pls
  availableAudience: Array<string>;
  additionalFields: Array<NavigationItemAdditionalField>;
  contentTypesNameFields: PluginConfigNameFields;
  onSubmit: (payload: SanitizedFormPayload) => void;
  onCancel: () => ToBeFixed; // TODO: Type this pls
  getContentTypeEntities: (value: {modelUID: string, query: ContentTypeSearchQuery }, plugin: string) => ToBeFixed // TODO: Type this pls
  usedContentTypesData: ToBeFixed; // TODO: Type this pls
  appendLabelPublicationStatus: (label: string, entity: ToBeFixed) => string; // TODO: Content type entity type
}
type ContentTypeSearchQuery = ToBeFixed;
type RawFormPayload = {
  type: NavigationItemType;
  related: string;
  relatedType: string;
  audience: number;
  menuAttached: boolean;
  title: string;
  externalPath: string;
  path: string;
}

type SanitizedFormPayload = {
  title: string;
  type: NavigationItemType;
  menuAttached: boolean;
  path: string | undefined;
  externalPath: string | undefined;
  related: Id | undefined;
  relatedType: string | undefined;
  isSingle: boolean;
  singleRelatedItem: ToBeFixed; // TODO: This is contentTypeEntity type or undefined
  uiRouterKey: string | undefined;
}

const NavigationItemForm: React.FC<NavigationItemFormProps> = ({
  isLoading,
  inputsPrefix = '',
  data = {},
  contentTypes = [],
  contentTypeEntities = [],
  usedContentTypeEntities = [],
  availableAudience = [],
  additionalFields = [],
  contentTypesNameFields = {},
  onSubmit,
  onCancel,
  getContentTypeEntities,
  usedContentTypesData,
  appendLabelPublicationStatus = () => '',
  locale,
}) => {
  const [hasBeenInitialized, setInitializedState] = useState(false);
  const [hasChanged, setChangedState] = useState(false);
  const [contentTypeSearchQuery, setContentTypeSearchQuery] = useState<ContentTypeSearchQuery>(undefined);
  const [contentTypeSearchInputValue, setContentTypeSearchInputValue] = useState(undefined);
  const [form, setFormState] = useState<Partial<RawFormPayload>>({});
  const [formErrors, setFormErrorsState] = useState({});
  const { relatedType } = form;

  const relatedFieldName = `${inputsPrefix}related`;

  if (!hasBeenInitialized && !isEmpty(data)) {
    setInitializedState(true);
    setFormState({
      ...data,
      type: data.type || navigationItemType.INTERNAL,
      related: data.related?.value,
      relatedType: data.relatedType?.value,
      audience: data.audience?.map((item: Audience) => item.id),
    });
  }

  const audience = get(form, `${inputsPrefix}audience`, []);
  const audienceOptions = availableAudience.map((item) => ({
    value: get(item, 'id', " "),
    label: get(item, 'name', " "),
  }));

  const generatePreviewPath = () => {
    if (!isExternal) {
      const value = `${data.levelPath !== '/' ? `${data.levelPath}` : ''}/${form.path !== '/' ? form.path || '' : ''}`;
      return {
        id: getTradId('popup.item.form.type.external.description'),
        defaultMessage: '',
        values: { value }
      }
    }
    return null;
  };

  const sanitizePayload = (payload: RawFormPayload): SanitizedFormPayload => {
    const { related, relatedType, menuAttached, type, ...purePayload } = payload;
    const relatedId = related;
    const singleRelatedItem = isSingleSelected ? first(contentTypeEntities) : undefined;
    const relatedCollectionType = relatedType;
    const title = payload.title;

    return {
      ...purePayload,
      title,
      type,
      menuAttached: isNil(menuAttached) ? false : menuAttached,
      path: type !== navigationItemType.EXTERNAL ? purePayload.path : undefined,
      externalPath: type === navigationItemType.EXTERNAL ? purePayload.externalPath : undefined,
      related: type === navigationItemType.INTERNAL ? relatedId : undefined,
      relatedType: type === navigationItemType.INTERNAL ? relatedCollectionType : undefined,
      isSingle: isSingleSelected,
      singleRelatedItem,
      uiRouterKey: generateUiRouterKey(title, relatedId, relatedCollectionType),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const payload = sanitizePayload(form as RawFormPayload);
    const errors = await checkFormValidity(payload, formDefinition.schema(isSingleSelected));
    if (!errors || isEmpty(errors)) {
      return onSubmit(payload);
    } else {
      setFormErrorsState(errors);
    }
  };

  const onAudienceChange = (value: string) => {
    onChange({ target: { name: `${inputsPrefix}audience`, value } });
  }

  const onChange = ({ target: { name, value } }: { target: { name: string, value: unknown } }) => {
    setFormState(prevState => ({
      ...prevState,
      updated: true,
      [name]: value,
    }));
    if (!hasChanged) {
      setChangedState(true);
    }
  };

  const generateUiRouterKey = (title: string, related: string, relatedType: string): string | undefined => {
    if (title) {
      return isString(title) && !isEmpty(title) ? slugify(title).toLowerCase() : undefined;
    } else if (related) {
      const relationTitle = extractRelatedItemLabel({
        ...contentTypeEntities.find(_ => _.id === related),
        __collectionUid: relatedType
      }, contentTypesNameFields, { contentTypes });
      return isString(relationTitle) && !isEmpty(relationTitle) ? slugify(relationTitle).toLowerCase() : undefined;
    }
    return undefined;
  };

  const initialRelatedTypeSelected = data?.relatedType?.value;
  const relatedTypeSelectValue = form.relatedType;
  const relatedSelectValue = form.related;

  const isSingleSelected = useMemo(
    () => relatedTypeSelectValue ? contentTypes.find(_ => _.uid === relatedTypeSelectValue)?.isSingle || false : false,
    [relatedTypeSelectValue, contentTypes],
  );

  const navigationItemTypeOptions = Object.keys(navigationItemType).map((k) => {
    const key = k as keyof typeof navigationItemType; // TODO: Maybe could be refactored later
    const value = navigationItemType[key].toLowerCase();
    return {
      key,
      value: navigationItemType[key],
      metadatas: {
        intlLabel: {
          id: getTradId(`popup.item.form.type.${value}.label`),
          defaultMessage: getTradId(`popup.item.form.type.${value}.label`),
        }
      }
    }
  });

  const relatedSelectOptions = contentTypeEntities
    .filter((item) => {
      const usedContentTypeEntitiesOfSameType = usedContentTypeEntities
        .filter(uctItem => relatedTypeSelectValue === uctItem.__collectionUid);
      return !find(usedContentTypeEntitiesOfSameType, uctItem => (item.id === uctItem.id && uctItem.id !== form.related));
    })
    .map((item) => {
      const label = appendLabelPublicationStatus(
        extractRelatedItemLabel({
          ...item,
          __collectionUid: get(relatedTypeSelectValue, 'value', relatedTypeSelectValue),
        }, contentTypesNameFields, { contentTypes }),
        item
      );
      return ({
        key: get(item, 'id'),
        metadatas: {
          intlLabel: {
            id: label || `${item.__collectionUid} ${item.id}`,
            defaultMessage: label || `${item.__collectionUid} ${item.id}`,
          }
        },
        value: item.id,
        label: label,
      })
    });

  const isExternal = form.type === navigationItemType.EXTERNAL;
  const pathSourceName = isExternal ? 'externalPath' : 'path';

  const submitDisabled =
    (form.type === navigationItemType.INTERNAL && !isSingleSelected && isNil(get(form, `${inputsPrefix}related`))) ||
    (form.type === navigationItemType.WRAPPER && isNil(get(form, `${inputsPrefix}title`)));

  const debouncedSearch = useCallback(
    debounce(nextValue => setContentTypeSearchQuery(nextValue), 500),
    [],
  );

  const debounceContentTypeSearchQuery = (value: ToBeFixed) => {
    setContentTypeSearchInputValue(value);
    debouncedSearch(value);
  };

  const onChangeRelatedType = ({ target: { name, value } }: { target: { name: string, value: unknown } }) => {
    const relatedTypeBeingReverted = data.relatedType && (data.relatedType.value === get(value, 'value', value));
    setContentTypeSearchQuery(undefined);
    setContentTypeSearchInputValue(undefined);
    setFormState(prevState => ({
      ...prevState,
      updated: true,
      related: relatedTypeBeingReverted ? data.related?.value : undefined,
      [name]: value,
    }));
    if (!hasChanged) {
      setChangedState(true);
    }
  };

  const relatedTypeSelectOptions = useMemo(
    () => contentTypes
      .filter((contentType) => {
        if (contentType.isSingle) {
          if (relatedTypeSelectValue && [relatedTypeSelectValue, initialRelatedTypeSelected].includes(contentType.uid)) {
            return true;
          }
          return !usedContentTypesData.some((_: ToBeFixed) => _.__collectionUid === contentType.uid && _.__collectionUid !== form.relatedType);
        }
        return true;
      })
      .map((item) => ({
        key: get(item, 'uid'),
        metadatas: {
          intlLabel: {
            id: get(item, 'label', get(item, 'name')),
            defaultMessage: get(item, 'label', get(item, 'name')),
          }
        },
        value: get(item, 'uid'),
        label: get(item, 'label', get(item, 'name')),
      })),
    [contentTypes, usedContentTypesData, relatedTypeSelectValue],
  );

  const thereAreNoMoreContentTypes = isEmpty(relatedSelectOptions) && !contentTypeSearchQuery;

  useEffect(
    () => {
      const value = get(relatedSelectOptions, '0');
      if (isSingleSelected && relatedSelectOptions.length === 1 && !isEqual(value, relatedSelectValue)) {
        onChange({ target: { name: relatedFieldName, value } });
      }
    },
    [isSingleSelected, relatedSelectOptions],
  );

  useEffect(() => {
    const value = relatedType;
    const fetchContentTypeEntities = async () => {
      if (value) {
        const item = find(
          contentTypes,
          (_) => _.uid === value,
        );
        if (item) {
          await getContentTypeEntities({
            modelUID: item.uid,
            query: contentTypeSearchQuery,
            locale,
          }, item.plugin);
        }
      }
    };
    fetchContentTypeEntities();
  }, [relatedType, contentTypeSearchQuery]);
  return (
    <>
      <Formik>
        <Form>
          <ModalBody>
            <Grid gap={5} >
              <GridItem key={`${inputsPrefix}title`} col={12} >
                <GenericInput
                  autoFocused={true}
                  intlLabel={{
                    id: getTradId('popup.item.form.title.label'),
                    defaultMessage: 'Title',
                  }
                  }
                  name={`${inputsPrefix}title`}
                  placeholder={{
                    id: "e.g. Blog",
                    defaultMessage: 'e.g. Blog',
                  }}
                  description={{
                    id: getTradId('popup.item.form.title.placeholder'),
                    defaultMessage: 'e.g. Blog',
                  }}
                  type='text'
                  error={get(formErrors, `${inputsPrefix}title.id`)}
                  onChange={onChange}
                  value={get(form, `${inputsPrefix} title`, '')}
                />
              </GridItem>
              <GridItem key={`${inputsPrefix} type`} col={4} lg={12}>
                <GenericInput
                  intlLabel={{
                    id: getTradId('popup.item.form.type.label'),
                    defaultMessage: 'Internal link',
                  }}
                  name={`${inputsPrefix} type`}
                  options={navigationItemTypeOptions}
                  type='select'
                  error={get(formErrors, `${inputsPrefix} type.id`)}
                  onChange={onChange}
                  value={get(form, `${inputsPrefix} type`, '')}
                />
              </GridItem>
              <GridItem key={`${inputsPrefix} menuAttached`} col={4} lg={12}>
                <GenericInput
                  intlLabel={{
                    id: getTradId('popup.item.form.menuAttached.label'),
                    defaultMessage: 'MenuAttached',
                  }}
                  name={`${inputsPrefix} menuAttached`}
                  type='bool'
                  error={get(formErrors, `${inputsPrefix} menuAttached.id`)}
                  onChange={onChange}
                  value={get(form, `${inputsPrefix} menuAttached`, '')}
                  disabled={!(data.isMenuAllowedLevel && data.parentAttachedToMenu)}
                />
              </GridItem>
              <GridItem key={`${inputsPrefix} path`} col={12}>
                <GenericInput
                  intlLabel={{
                    id: getTradId(`popup.item.form.${pathSourceName}.label`),
                    defaultMessage: 'Path',
                  }}
                  name={`${inputsPrefix}${pathSourceName} `}
                  placeholder={{
                    id: getTradId(`popup.item.form.${pathSourceName}.placeholder`),
                    defaultMessage: 'e.g. Blog',
                  }}
                  type='text'
                  error={get(formErrors, `${inputsPrefix}${pathSourceName}.id`)}
                  onChange={onChange}
                  value={get(form, `${inputsPrefix}${pathSourceName} `, '')}
                  description={generatePreviewPath()}
                />
              </GridItem>
              {get(form, `${inputsPrefix} type`) === navigationItemType.INTERNAL && (
                <>
                  <GridItem col={6} lg={12}>
                    <GenericInput
                      type="select"
                      intlLabel={{
                        id: getTradId('popup.item.form.relatedType.label'),
                        defaultMessage: 'Related Type'
                      }}
                      placeholder={{
                        id: getTradId('popup.item.form.relatedType.placeholder'),
                        defaultMessage: 'Related Type'
                      }}
                      name={`${inputsPrefix} relatedType`}
                      error={get(formErrors, `${inputsPrefix} relatedType.id`)}
                      onChange={onChangeRelatedType}
                      options={relatedTypeSelectOptions}
                      value={relatedTypeSelectValue}
                      disabled={isLoading || isEmpty(relatedTypeSelectOptions)}
                      description={
                        !isLoading && isEmpty(relatedTypeSelectOptions)
                          ? {
                            id: getTradId('popup.item.form.relatedType.empty'),
                            defaultMessage: 'There are no more content types',
                          }
                          : undefined
                      }
                    />
                  </GridItem>
                  {relatedTypeSelectValue && !isSingleSelected && (
                    <GridItem col={6} lg={12}>
                      <GenericInput
                        type="select"
                        intlLabel={{
                          id: getTradId('popup.item.form.related.label'),
                          defaultMessage: 'Related'
                        }}
                        placeholder={{
                          id: getTradId('popup.item.form.related.label'),
                          defaultMessage: 'Related'
                        }}
                        name={relatedFieldName}
                        error={get(formErrors, `${relatedFieldName}.id`)}
                        onChange={onChange}
                        onInputChange={debounceContentTypeSearchQuery}
                        inputValue={contentTypeSearchInputValue}
                        options={relatedSelectOptions}
                        value={relatedSelectValue}
                        disabled={isLoading || thereAreNoMoreContentTypes}
                        description={
                          !isLoading && thereAreNoMoreContentTypes
                            ? {
                              id: getTradId('popup.item.form.related.empty'),
                              defaultMessage: 'There are no more entities',
                              values: { contentTypeName: relatedTypeSelectValue },
                            }
                            : undefined
                        }
                      />
                    </GridItem>
                  )}
                </>
              )}

              {additionalFields.includes('audience') && (
                <GridItem key={`${inputsPrefix} audience`} col={6} lg={12}>
                  <Select
                    id={`${inputsPrefix} audience`}
                    placeholder={getMessage('popup.item.form.audience.placeholder')}
                    label={getMessage('popup.item.form.audience.label')}
                    onChange={onAudienceChange}
                    value={audience}
                    hint={
                      !isLoading && isEmpty(audienceOptions)
                        ? getMessage('popup.item.form.audience.empty', 'There are no more audiences')
                        : undefined
                    }
                    multi
                    withTags
                    disabled={isEmpty(audienceOptions)}
                  >
                    {audienceOptions.map(({ value, label }) => <Option key={value} value={value}>{label}</Option>)}
                  </Select>
                </GridItem>
              )}
            </Grid>
          </ModalBody>
        </Form>
      </Formik>
      <NavigationItemPopupFooter handleSubmit={handleSubmit} handleCancel={onCancel} submitDisabled={submitDisabled} />
    </>
  );
};

export default NavigationItemForm;
