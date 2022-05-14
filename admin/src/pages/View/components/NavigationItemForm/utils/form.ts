import * as yup from "yup";
import { isNil } from "lodash";
//@ts-ignore
import { translatedErrors } from "@strapi/helper-plugin";
import { navigationItemType } from "../../../utils/enums";
import { NavigationItemType } from "../../../../../../../types";
import { RawFormPayload } from "../types";
import { getTradId } from "../../../../../translations";

export const schemaFactory = (isSingleSelected: boolean) => {
  return yup.object({
    title: yup.string()
      .when('type', {
        is: (val: NavigationItemType) => val !== navigationItemType.INTERNAL,
        then: yup.string()
          .required(translatedErrors.required),
        otherwise: yup.string().notRequired(),
      }),
    uiRouterKey: yup.string().required(translatedErrors.required),
    type: yup.string().required(translatedErrors.required),
    path: yup.string()
      .when('type', {
        is: (val: NavigationItemType) => val !== navigationItemType.EXTERNAL || isNil(val),
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string().notRequired(),
      }),
    externalPath: yup.string()
      .when('type', {
        is: (val: NavigationItemType) => val === navigationItemType.EXTERNAL,
        then: yup.string()
          .required(translatedErrors.required)
          .matches(/(#.*)|(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/, {
            excludeEmptyString: true,
            message: getTradId("popup.item.form.externalPath.validation.type"),
          }),
        otherwise: yup.string().notRequired(),
      }),
    menuAttached: yup.boolean(),
    relatedType: yup.mixed()
      .when('type', {
        is: (val: NavigationItemType) => val === navigationItemType.INTERNAL || isNil(val),
        then: isSingleSelected ? yup.mixed().notRequired() : yup.mixed().required(translatedErrors.required),
        otherwise: yup.mixed().notRequired(),
      }),
    related: yup.mixed()
      .when('type', {
        is: (val: NavigationItemType) => val === navigationItemType.INTERNAL || isNil(val),
        then: isSingleSelected ? yup.mixed().notRequired() : yup.mixed().required(translatedErrors.required),
        otherwise: yup.mixed().notRequired(),
      }),
  });
};

export const defaultValues: RawFormPayload = {
  type: "INTERNAL",
  related: "",
  relatedType: "",
  audience: [],
  menuAttached: false,
  title: "",
  externalPath: "",
  path: "",
  additionalFields: {},
  updated: false,
}
