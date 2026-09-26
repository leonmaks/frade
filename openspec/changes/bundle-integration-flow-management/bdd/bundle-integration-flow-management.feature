Feature: Manage Integration Flows inside a Diagram Bundle

  @BF-01
  Scenario: Open empty Bundle
    Given a diagram contains System A and System B
    And an empty Bundle connects A and B
    And Repository contains three Integration Flows between A and B
    When the user opens Integration Flow Manager
    Then all three flows are listed
    And all membership checkboxes are unchecked
    And the header shows "0" flows in the Bundle

  @BF-02
  Scenario: Find both directions
    Given Repository contains Flow F1 from A to B
    And Repository contains Flow F2 from B to A
    When Flow Manager is opened for Bundle A-B
    Then F1 is shown as A -> B
    And F2 is shown as B -> A

  @BF-03
  Scenario: Exclude unrelated flows by default
    Given Repository contains Flow F1 A -> B
    And Flow F2 A -> C
    When Flow Manager is opened for Bundle A-B
    Then F1 is shown
    And F2 is not shown

  @BF-04
  Scenario: Existing membership
    Given Bundle A-B already contains F2
    When Flow Manager is opened
    Then F2 membership checkbox is checked

  @BF-05
  Scenario: Include a flow
    Given eligible F1 is not included
    When the user checks "В жгуте" for F1
    Then F1 reference is added to the Bundle
    And F1 Repository object is unchanged
    And the Diagram becomes dirty

  @BF-06
  Scenario: Exclude a flow
    Given F1 is included
    When the user unchecks "В жгуте"
    Then F1 is removed from the Bundle
    And F1 still exists in Repository

  @BF-07
  Scenario: Prevent duplicate membership
    Given F1 is already included
    When an add operation for F1 is executed again
    Then Bundle contains exactly one reference to F1

  @BF-08
  Scenario: Undo inclusion
    Given F1 was just added
    When the user executes Undo
    Then F1 is no longer included

  @BF-09
  Scenario: Redo inclusion
    Given inclusion of F1 was undone
    When the user executes Redo
    Then F1 is included again

  @BF-10
  Scenario: Persist membership
    Given F1 and F3 are included
    When the diagram is saved and reopened
    Then F1 and F3 remain included
    And no Integration Flow attributes are duplicated into the Bundle

  @BF-11
  Scenario: View all attributes
    Given F1 is visible in Flow Manager
    When the user opens F1 details
    Then all readable metamodel attributes of F1 are visible

  @BF-12
  Scenario: Search inside current pair
    Given several flows exist between A and B
    When the user searches for "customer"
    Then only matching A-B flows are displayed
    And membership state remains correct

  @BF-13
  Scenario: Filter by direction
    Given A -> B and B -> A flows exist
    When Direction filter is set to A -> B
    Then only A -> B flows are displayed

  @BF-14
  Scenario: Extended search
    Given Flow F5 connects C -> D
    When "Искать во всем репозитории" is checked
    And the user searches for F5
    Then F5 is displayed
    And its Source and Consumer are visible

  @BF-15
  Scenario: Non-eligible extended result
    Given F5 connects C -> D
    And current Bundle is A-B
    When F5 is displayed through extended search
    Then its membership checkbox is disabled
    And an explanation says F5 cannot be included in A-B

  @BF-16
  Scenario: Return to pair scope
    Given extended search is enabled
    When the user unchecks "Искать во всем репозитории"
    Then only eligible A-B flows remain in the result set

  @BF-17
  Scenario: Empty pair
    Given Repository has no flow between A and B
    When Flow Manager opens
    Then an empty state is shown
    And "Создать поток" is available
    And extended search can be enabled

  @BF-18
  Scenario: Create A -> B
    Given Bundle A-B is open
    When the user chooses "Новый поток"
    And selects direction A -> B
    And supplies all required attributes
    And saves
    Then a new Integration Flow is created in Repository
    And its source is A
    And consumer is B

  @BF-19
  Scenario: Create B -> A
    Given Bundle A-B is open
    When the user creates a flow with direction B -> A
    Then source is B
    And consumer is A

  @BF-20
  Scenario: Create and automatically include
    Given "Добавить в текущий жгут" is checked
    When the new flow is successfully created
    Then its canonical RepoObjectRef is added to the current Bundle

  @BF-21
  Scenario: Create validation
    Given required attributes are missing
    When the user attempts to save
    Then Repository create is not called
    And validation errors are displayed

  @BF-22
  Scenario: Duplicate user-defined ID
    Given Repository requires user-defined IDs
    And the entered ID already exists
    When the form is saved
    Then create fails with an ID conflict
    And no Bundle membership is added

  @BF-23
  Scenario: Repository create succeeds but membership fails
    Given a valid new flow
    And Repository create succeeds
    And Diagram membership mutation fails
    Then the new Repository object remains
    And the UI reports that it was not added to the Bundle
    And "Retry adding" is offered

  @BF-24
  Scenario: Edit normal attribute
    Given F1 is included in Bundle A-B
    When its description is edited
    Then canonical F1 is updated
    And membership remains unchanged

  @BF-25
  Scenario: Reverse direction
    Given F1 is A -> B
    And F1 belongs to Bundle A-B
    When the user chooses Reverse Direction
    And saves
    Then F1 becomes B -> A
    And F1 retains the same canonical ID
    And all non-endpoint attributes are preserved
    And F1 remains in Bundle A-B

  @BF-26
  Scenario: Endpoint change makes membership invalid
    Given F1 A -> B belongs to Bundle A-B
    When F1 consumer is changed from B to C
    Then the user is warned that F1 will be excluded
    When the user confirms and saves
    Then F1 becomes A -> C in Repository
    And F1 is removed from Bundle A-B

  @BF-27
  Scenario: Cancel invalidating endpoint edit
    Given F1 belongs to Bundle A-B
    When the user changes an endpoint to C
    And declines the warning
    Then Repository F1 remains unchanged
    And Bundle membership remains unchanged

  @BF-28
  Scenario: Clone eligible flow
    Given F1 A -> B exists
    When the user clones F1
    Then a new object F2 is created
    And F2 has a different canonical ID
    And cloneable attributes equal F1
    And source/consumer remain A/B

  @BF-29
  Scenario: Clone extended-search flow for current Bundle
    Given current Bundle is A-B
    And search result F5 is C -> D
    When the user selects "Клонировать для A ↔ B"
    Then the create form copies cloneable F5 attributes
    And uses A and B as endpoints
    And allows choosing A -> B or B -> A

  @BF-30
  Scenario: Broken reference
    Given Bundle contains reference F1
    And F1 no longer exists in Repository
    When the diagram is opened
    Then Flow Manager shows a broken reference
    And the user can exclude the broken reference
    And the application does not crash

  @BF-31
  Scenario: Read-only Repository
    Given Repository is read-only
    And Diagram is writable
    When Flow Manager opens
    Then existing eligible flows can be included/excluded
    And Create is disabled
    And Edit is disabled
    And Reverse is disabled
    And Clone is disabled

  @BF-32
  Scenario: Read-only Diagram
    Given Diagram is read-only
    When Flow Manager opens
    Then membership controls are disabled

  @BF-33
  Scenario: Repository query failure
    Given Repository query fails
    When Flow Manager opens
    Then an error state is shown
    And the state is not presented as "no flows found"
    And Retry is available

  @BF-34
  Scenario: Repository refresh
    Given Flow Manager is open
    And another operation creates eligible F4
    When Repo Core publishes repository change
    Then F4 can appear after query/cache refresh
    Without reopening the diagram

  @BF-35
  Scenario: Reconnect Bundle and remove incompatible flows
    Given Bundle A-B contains F1 A -> B
    When the user reconnects endpoint B to System C
    Then the user is warned that F1 becomes incompatible
    When the user confirms
    Then Bundle becomes A-C
    And F1 is removed from Bundle membership
    And F1 remains in Repository

  @BF-36
  Scenario: Undo Bundle reconnect
    Given Bundle A-B with F1 was reconnected to A-C
    And incompatible F1 was removed
    When Undo is executed
    Then Bundle endpoints return to A-B
    And F1 membership is restored

  @BF-37
  Scenario: Delete Bundle
    Given Bundle A-B contains F1 and F2
    When Bundle is deleted from Diagram
    Then Diagram Bundle is removed
    And F1 remains in Repository
    And F2 remains in Repository

  @BF-38
  Scenario: Keyboard membership
    Given focus is on F1 membership checkbox
    When Space is pressed
    Then membership toggles
    And focus remains predictable

  @BF-39
  Scenario: Accessible direction
    Given a screen reader is active
    When F1 A -> B is focused
    Then direction is announced as textual Source -> Consumer information
    And is not represented by icon alone

  @BF-40
  Scenario: Large repository
    Given Repository contains 100000 Integration Flows
    When Flow Manager opens for Bundle A-B
    Then UI does not render 100000 table rows
    And query uses Repo Core filtering/indexing
    And results use paging or virtualization

  @BF-41
  Scenario: Filtered bulk include
    Given a filter produces five eligible flows
    When the user invokes bulk include
    Then exactly those five flows are included
    And Undo restores all five memberships in one logical operation

  @BF-42
  Scenario: Non-eligible flows ignored by bulk include
    Given extended search results contain eligible and non-eligible flows
    When bulk include is executed
    Then only eligible flows are included
