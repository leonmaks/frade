# Planned additive documentation amendment

Status: PROPOSED_FOR_APPLY_WITH_ACCEPTED_PRODUCT_SCOPE. These texts explain the accepted local exception; canonical documentation has not changed during planning. Apply only after fresh PRE PASS and include resulting docs/source hashes in POST.

## Frade UI Style Guide v1.0, section 5.1 — append subsection

### Diagram editor presentation scope

Draw.io и Frade Draw используют одну общую светлую область редактирования независимо от темы внешнего workbench. В неё входят полотно, редакторские toolbar/палитры/панели, сообщения, меню, tooltip и принадлежащие редактору app-rendered popup/dialogs, включая portaled поверхности. Глобальные вкладки workbench, Settings и переключатель темы сохраняют тему приложения. Плотность выбирается независимо.

Область MUST использовать существующие семантические Light-роли и общий scoped profile обоих редакторов; две отдельные палитры и второй resolver запрещены. Нейтральное полотно — #F9FAFC, декоративные точки — #CDD3DC. Явный авторский фон страницы/изображения сохраняется. Тема приложения MUST NOT инвертировать или переписывать авторские fill/stroke/text/opacity/gradient/style values; образцы цветов проверяются на сопоставимой подложке. Это display policy, не изменение сохранённого документа, export, snapping или routing.

Windows forced colors MUST иметь финальный системный приоритет; при его отключении возвращается светлая область без записи авторских атрибутов. Обычный выбор HC без forced colors не меняет фиксированную светлую область. A11Y-001..010 сохраняются. FDS-009 продолжает действовать для внешнего workbench; данное исключение ограничено двумя редакторами. Редакторские контролы используют общую геометрию Frade, включая density, независимо от reference preset внешнего workbench. OS-owned окна остаются системными поверхностями и не объявляются app-rendered.

## Themes and Plugins Spec, section 6 — append subsection

### Local diagram presentation under one transaction

The existing resolver still produces the authoritative application snapshot and selection. Native Frade and embedded Draw.io derive one fixed Light editor scope from shared canonical roles, independent density and the same transaction revision. The scope includes editor-owned portals and excludes global overlays. Windows forced colors remains the final system mapping. Local projection does not create a second resolver, a persisted theme preference or a second outcome/ACK protocol.

Prepare/apply/rollback, authenticated source/origin/session/generation/membership/revision checks, painted acknowledgement, existing deadlines, first paint, dirty preservation and compensation remain mandatory for all scoped consumers. Identical editor colors across two application revisions do not permit reusing an old ACK. Authored document paint/export semantics are not theme data. Reference theme geometry/colors remain applicable to the external workbench, with the light-editor adaptation disclosed separately.
