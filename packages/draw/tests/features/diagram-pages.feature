Feature: Multiple pages in one native drawing

  @PAGE-001
  Scenario: Preserve legacy content when inserting a page
    Given a legacy drawing with connected repository nodes
    When another drawing page is inserted
    Then both pages survive a complete file round trip

  @PAGE-002
  Scenario: Duplicate a page independently
    Given a legacy drawing with connected repository nodes
    When the drawing page is duplicated
    Then copied terminals and references are correct and the original is unchanged

  @PAGE-003
  Scenario: Removing the last page preserves a usable document
    Given a legacy drawing with connected repository nodes
    When the only drawing page is removed
    Then one new empty first page remains

  @PAGE-004
  Scenario: Natural page ordering and clear all
    Given drawing pages named Page-10, Page-2 and Page-1
    When drawing pages are sorted and cleared
    Then sorting is natural and clearing retains one empty page

  @PAGE-005
  Scenario: Validate inactive page content before opening
    Given a drawing whose inactive page has a dangling connection
    When the complete drawing is parsed
    Then the invalid drawing is rejected
