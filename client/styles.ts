import { StyleSheet } from "react-native"
import { Colors } from "@styles/."

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.PRIMARY_TEXT_COLOR, // white
  },
  item: {
    backgroundColor: Colors.ACTIVE_COLOR,
    marginTop: 10,
    padding: 20,
    marginHorizontal: 10,
    borderColor: Colors.ACTIVE_COLOR,
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectedTenant: {
    backgroundColor: Colors.DARK_BLUE_COLOR,
  },
  itemLabel: {
    color: Colors.PRIMARY_TEXT_COLOR,
    fontSize: 18,
    fontWeight: "600",
  },
  activeColor: {
    backgroundColor: Colors.SO_BLUE_COLOR,
  },
  textBtnColor: {
    color: Colors.PRIMARY_TEXT_COLOR,
  },
  saveButton: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
    padding: 18,
    margin: 24,
    marginBottom: 32,
  },
  tenantRouteOrderLabel: {
    flexDirection: "row",
  },
  changeRouteOrderBtn: {
    flex: 1,
    paddingTop: 13,
    paddingRight: 13,
  },
  changeRouteOrderText: {
    color: Colors.ACTIVE_COLOR,
  },
})
