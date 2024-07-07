import React from "react"
import useViewModel, { ScreenProps, ViewModel } from "./useViewModel"
import ScreenView from "./view"
import ScreenController from "@components/ScreenController"

export default function TenantRouteOrderScreen(props: ScreenProps) {
  return (
    <ScreenController<ScreenProps, ViewModel>
      {...{ props, useViewModel, ScreenView }}
      disableActivityIndicator={true}
    />
  )
}
