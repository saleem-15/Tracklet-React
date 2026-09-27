# Graph Report - .  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3843 nodes · 10343 edges · 129 communities (124 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0698339b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- live-browser.js
- checks.mjs
- App.tsx
- connectSSE
- constants.ts
- injected/index.mjs
- design-system.mjs
- detect-antipatterns-browser.js
- parseAnyColor
- live-server.mjs
- AuthScreen.tsx
- concept-seed.mjs
- hook-lib.mjs
- setLiveState
- el
- svelte-component.mjs
- initPageChat
- modern-screenshot.umd.js
- css-cascade.mjs
- live-commit-manual-edits.mjs
- context.mjs
- dependencies
- AllApplicationsTable.tsx
- impeccable-config.mjs
- detect-html.mjs
- hook-admin.mjs
- detect-text.mjs
- live-copy-edit-agent.mjs
- scanCssTextForPulsingDot
- manual-apply.mjs
- manifest.json
- design-parser.mjs
- analyticsUtils.ts
- generate-image.mjs
- live-accept.mjs
- RichTextEditor.tsx
- detect-antipatterns.mjs
- live-wrap.mjs
- ApplicationDetailPanel.tsx
- doctor.mjs
- hook-before-edit.mjs
- ImportCSVModal.tsx
- IconButton.tsx
- parseRgb
- initGlobalBar
- ApplicationStatus
- editor/useRichTextEditor.ts
- live-manual-edit-evidence.mjs
- handleGo
- checkQuality
- runHook
- live-poll.mjs
- content.js
- popup.js
- ContactsView.tsx
- discoverTargetCandidates
- roots.mjs
- collectBrowserFindings
- checkHtmlPatterns
- staleness.mjs
- types.ts
- session-store.mjs
- resolveLiveInjectionAnchor
- handleManualEditActivity
- linkUtils.ts
- TopBar.tsx
- editorBlocks.ts
- live-status.mjs
- richTextMarkdownUtils.ts
- accept-css.mjs
- manual-edit-routes.mjs
- insert-ui.mjs
- svelte-ast.mjs
- parseAnyColor
- detect-url.mjs
- editor/editorDom.ts
- lib/editor/editorActions.tsx
- webmailCompanion.test.ts
- impeccable-paths.mjs
- serve-question.mjs
- live-inject.mjs
- FollowUpModal.tsx
- tanstack-adapter.mjs
- compilerOptions
- filterFindings
- sveltekit-adapter.mjs
- resolveProject
- critique-storage.mjs
- onAnnotDown
- event-validation.mjs
- context-signals.mjs
- template-extensions.mjs
- sampleCssBackground
- detect-utils.mjs
- frameworks/index.mjs
- dedupUtils.ts
- common.ps1
- StaticElement
- pin.mjs
- ErrorBoundary
- surface-briefs.mjs
- live.mjs
- browser-script-parts.mjs
- journal.mjs
- generation-preflight.mjs
- staleness-notice.mjs
- readConfig
- palette.mjs
- instructions.mjs
- target-args.mjs
- checkElementGptBorderShadowDOM
- source-lock.mjs
- BORDER_SAFE_TAGS
- background.js
- isScreenReaderOnlyTextStyle
- create-new-feature.ps1
- checkHeroEyebrow
- LinkPopover.tsx
- detect.mjs
- checkElementRadialSpotlightDOM
- hook.mjs
- vite-env.d.ts
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `Application` - 84 edges
2. `Contact` - 57 edges
3. `el()` - 51 edges
4. `TrackletAppContent()` - 47 edges
5. `parseAnyColor()` - 44 edges
6. `runHook()` - 43 edges
7. `parseAnyColor()` - 39 edges
8. `ApplicationStatus` - 38 edges
9. `collectBrowserFindings()` - 37 edges
10. `setLiveState()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `syncPendingAppsFromStorage()` --indirect_call--> `payload()`  [INFERRED]
  src/lib/extensionSync.ts → .agents/skills/impeccable/scripts/hook-lib.mjs
- `measureHiddenTextDOM()` --indirect_call--> `el()`  [INFERRED]
  .agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js → .agents/skills/impeccable/scripts/live-browser.js
- `measureHiddenTextDOM()` --indirect_call--> `el()`  [INFERRED]
  .agents/skills/impeccable/scripts/detector/rules/checks.mjs → .agents/skills/impeccable/scripts/live-browser.js
- `TrackletAppContent()` --references--> `react`  [EXTRACTED]
  src/App.tsx → package.json
- `AddApplicationModal()` --references--> `react`  [EXTRACTED]
  src/components/AddApplicationModal.tsx → package.json

## Import Cycles
- None detected.

## Communities (129 total, 5 thin omitted)

### Community 0 - "live-browser.js"
Cohesion: 0.03
Nodes (140): addManualContextText(), applyGlobalBarLabelState(), applyPlaceholderSizingStyles(), averageRgb01(), bindEditBadgeProxy(), bufferToBase64(), buildCollapsible(), buildColorModels() (+132 more)

### Community 1 - "checks.mjs"
Cohesion: 0.04
Nodes (99): borderColorsFromStyle(), borderWidthsFromStyle(), checkClippedOverflow(), checkEdgeFlushCardsDOM(), checkElementBlinkingCursorDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM(), checkElementGptBorderShadow() (+91 more)

### Community 2 - "App.tsx"
Cohesion: 0.07
Nodes (46): TrackletAppContent(), AddApplicationModalProps, ApplicationDetailPanelProps, ContactDetailPanelProps, ContactCardGridProps, ContactModalProps, ContactsViewProps, GuestMigrationModal() (+38 more)

### Community 3 - "connectSSE"
Cohesion: 0.06
Nodes (74): applyParamDefaults(), applyParamValue(), applySavedSessionMeta(), buildParamsPanel(), clampVariantIndex(), clearHandled(), clearSession(), closedClipPath() (+66 more)

### Community 4 - "constants.ts"
Cohesion: 0.06
Nodes (59): AddApplicationContactsSection(), AddApplicationContactsSectionProps, AddApplicationCoreForm(), AddApplicationCoreFormProps, AddApplicationMetadataForm(), AddApplicationMetadataFormProps, AddApplicationModal(), ApplicationSearchPicker() (+51 more)

### Community 5 - "injected/index.mjs"
Cohesion: 0.06
Nodes (69): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), browserColorsClose(), browserDesignSystemConfig() (+61 more)

### Community 6 - "design-system.mjs"
Cohesion: 0.07
Nodes (69): addClampEndpoints(), addColorObject(), addDesignColor(), addFontSizeStep(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii() (+61 more)

### Community 7 - "detect-antipatterns-browser.js"
Cohesion: 0.06
Nodes (60): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), browserColorsClose(), browserDesignSystemConfig(), browserHasDirectText(), browserPrimaryFont(), browserRadiusTokens() (+52 more)

### Community 8 - "parseAnyColor"
Cohesion: 0.07
Nodes (64): checkBorders(), checkColors(), checkCreamPalette(), checkElementAIPaletteDOM(), checkElementBorders(), checkElementBordersDOM(), checkElementColors(), checkElementColorsDOM() (+56 more)

### Community 9 - "live-server.mjs"
Cohesion: 0.07
Nodes (58): eventPriority(), selectAvailablePendingEvent(), acknowledgePendingEvent(), activeSessionSummaries(), agentPollingConnected(), annotRoot, applyLegacyDeferredAcceptsOnStartup(), args (+50 more)

### Community 10 - "AuthScreen.tsx"
Cohesion: 0.07
Nodes (34): AccountSettingsCard(), AccountSettingsCardProps, AuthTextField(), AuthTextFieldProps, ForgotPasswordView(), ForgotPasswordViewProps, LoginView(), LoginViewProps (+26 more)

### Community 11 - "concept-seed.mjs"
Cohesion: 0.08
Nodes (52): API_BASE, API_TIMEOUT_MS, apiBudgetMs(), dealCompositions(), driveSelection(), fetchRoll(), here, loadLocal() (+44 more)

### Community 12 - "hook-lib.mjs"
Cohesion: 0.07
Nodes (55): ACK_EXTS, applyPatchText(), canonicalPath(), canonicalPathCache, clampByte(), clampGroupedToBudget(), clampLastLine(), clampToBudget() (+47 more)

### Community 13 - "setLiveState"
Cohesion: 0.11
Nodes (57): abandonForeignSession(), abortSvelteComponentInjection(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup(), cleanupAcceptedSession(), clearAnnotations() (+49 more)

### Community 14 - "el"
Cohesion: 0.07
Nodes (55): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+47 more)

### Community 15 - "svelte-component.mjs"
Cohesion: 0.08
Nodes (52): collectUnusedSelectors(), verifyAcceptedSource(), buildPropsScriptV2(), loadSvelteCompiler(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts(), bakeParamValuesInCss() (+44 more)

### Community 16 - "initPageChat"
Cohesion: 0.08
Nodes (54): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+46 more)

### Community 17 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (52): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+44 more)

### Community 18 - "css-cascade.mjs"
Cohesion: 0.08
Nodes (35): applyStaticDeclaration(), buildBorderOverrideMap(), buildStaticStyleMap(), buildStaticWindow(), collectStaticCssRules(), compareStaticPriority(), cssPropToCamel(), expandStaticBoxValues() (+27 more)

### Community 19 - "live-commit-manual-edits.mjs"
Cohesion: 0.11
Nodes (49): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+41 more)

### Community 20 - "context.mjs"
Cohesion: 0.08
Nodes (47): appendAutonomyCounterDirective(), appendBuildPathDirective(), appendDetectorFallback(), appendImageGenDirective(), appendImageToolsDirective(), appendSubagentAuthorizationDirective(), appendSurfaceBriefContext(), automaticHookMode() (+39 more)

### Community 21 - "dependencies"
Cohesion: 0.04
Nodes (48): autoprefixer, firebase, happy-dom, lucide-react, motion, dependencies, firebase, lucide-react (+40 more)

### Community 22 - "AllApplicationsTable.tsx"
Cohesion: 0.11
Nodes (26): ActivePipelineBoard(), ActivePipelineBoardProps, PIPELINE_COLUMNS, AllApplicationsTable(), AllApplicationsTableProps, getStageUrgencyClass(), EmptyState(), EmptyStateProps (+18 more)

### Community 23 - "impeccable-config.mjs"
Cohesion: 0.10
Nodes (46): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), COLOR_CHANNEL_FORMATS, colorIgnoreKey(), DEFAULT_DETECTION_CONFIG (+38 more)

### Community 24 - "detect-html.mjs"
Cohesion: 0.08
Nodes (34): mergeDesignSystemFindings(), checkPageTypography(), checkTypography(), isBrandFontOnOwnDomain(), firstOverusedGoogleFont(), runTextContentAnalyzers(), collectStaticCssText(), checkStaticPageTypography() (+26 more)

### Community 25 - "hook-admin.mjs"
Cohesion: 0.12
Nodes (42): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+34 more)

### Community 26 - "detect-text.mjs"
Cohesion: 0.08
Nodes (46): blankCssComments(), BLOCK_BRACE_PREFIX_KEYWORDS, CSS_IN_JS_EXTENSIONS, detectText(), extFromFilePath(), extractCSSinJS(), extractStyleBlocks(), findCSSinJSTemplates() (+38 more)

### Community 27 - "live-copy-edit-agent.mjs"
Cohesion: 0.12
Nodes (42): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchCandidates() (+34 more)

### Community 28 - "scanCssTextForPulsingDot"
Cohesion: 0.08
Nodes (41): buildHtmlPatternCorpora(), checkElementGlow(), checkElementHeroEyebrow(), checkGlow(), checkHoverContrast(), checkHtmlPatterns(), checkRadialSpotlight(), collectCssCustomProps() (+33 more)

### Community 29 - "manual-apply.mjs"
Cohesion: 0.10
Nodes (36): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+28 more)

### Community 30 - "manifest.json"
Cohesion: 0.05
Nodes (40): action, default_icon, default_popup, default_title, background, service_worker, commands, _execute_action (+32 more)

### Community 31 - "design-parser.mjs"
Cohesion: 0.13
Nodes (39): assessCoverage(), buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors() (+31 more)

### Community 32 - "analyticsUtils.ts"
Cohesion: 0.09
Nodes (32): ActivityMomentumCard(), ActivityMomentumCardProps, AnalyticsFilterBar(), AnalyticsFilterBarProps, TIMEFRAME_OPTIONS, AnalyticsHeroKPIs(), AnalyticsHeroKPIsProps, ConversionFunnelCard() (+24 more)

### Community 33 - "generate-image.mjs"
Cohesion: 0.08
Nodes (31): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+23 more)

### Community 34 - "live-accept.mjs"
Cohesion: 0.12
Nodes (38): acceptCli(), acceptReceiptPath(), argVal(), buildAcceptedWrappedSource(), buildCarbonizeReplacement(), decodeHtmlAttr(), deindentContent(), detectCommentSyntax() (+30 more)

### Community 35 - "RichTextEditor.tsx"
Cohesion: 0.10
Nodes (24): react, react, AddApplicationNotesSection(), AddApplicationNotesSectionProps, ApplicationNotesSection(), ApplicationNotesSectionProps, NoteLinksBar(), NoteLinksBarProps (+16 more)

### Community 36 - "detect-antipatterns.mjs"
Cohesion: 0.13
Nodes (34): confirm(), detectCli(), dim(), fileUrlToLocalPath(), formatAdvisorySection(), formatFindings(), formatFindingsBody(), formatFindingSummary() (+26 more)

### Community 37 - "live-wrap.mjs"
Cohesion: 0.14
Nodes (34): resolveSourceTraits(), argVal(), buildInsertWrapperLines(), computeInsertLine(), INSERT_POSITIONS, insertCli(), isInsertPosition(), resolveElementMatch() (+26 more)

### Community 38 - "ApplicationDetailPanel.tsx"
Cohesion: 0.12
Nodes (20): ApplicationDetailPanel(), ApplicationDetailFooter(), ApplicationDetailFooterProps, ApplicationMetricsBar(), ApplicationMetricsBarProps, SettingsView(), FollowUpTriggerDetails, clearNoteDraft() (+12 more)

### Community 39 - "doctor.mjs"
Cohesion: 0.12
Nodes (32): applyFixes(), cli(), collect(), parseArgs(), readProjectRootPatterns(), rel(), renderText(), safeRead() (+24 more)

### Community 40 - "hook-before-edit.mjs"
Cohesion: 0.13
Nodes (35): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), detectProposedHtml(), done(), escapeRegExp(), findingSignature() (+27 more)

### Community 41 - "ImportCSVModal.tsx"
Cohesion: 0.13
Nodes (27): RFC-4180, AddApplicationFooter(), AddApplicationFooterProps, ImportCSVModal(), ImportCSVModalProps, PRESET_HOURS, formatDateShort(), getMonthRange() (+19 more)

### Community 42 - "IconButton.tsx"
Cohesion: 0.10
Nodes (23): AddApplicationTasksSection(), AddApplicationTasksSectionProps, ApplicationQuickLinks(), ApplicationQuickLinksProps, ContactCard(), ContactCardProps, TaskChecklistSection(), TaskChecklistSectionProps (+15 more)

### Community 43 - "parseRgb"
Cohesion: 0.11
Nodes (35): analyzeVisualContrast(), analyzeVisualContrastCandidate(), checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlowDOM(), checkElementHoverContrast() (+27 more)

### Community 44 - "initGlobalBar"
Cohesion: 0.12
Nodes (33): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), buildDesignHeader(), cursorForInsertAxis(), designPanelCss(), detectPageTheme() (+25 more)

### Community 45 - "ApplicationStatus"
Cohesion: 0.10
Nodes (26): AddApplicationHeader(), AddApplicationHeaderProps, CompanyLogo(), CompanyLogoProps, SIZE_MAP, ApplicationDetailHeader(), ApplicationDetailHeaderProps, formatTimestamp() (+18 more)

### Community 46 - "editor/useRichTextEditor.ts"
Cohesion: 0.11
Nodes (22): cleanupEmptyLinks(), decorateAnchorsForUrl(), InlinePatternMatch, matchInlineMarkdown(), tryApplyInlineMarkdown(), shorthandFor(), isInsideCodeFence(), toggleTaskItem() (+14 more)

### Community 47 - "live-manual-edit-evidence.mjs"
Cohesion: 0.13
Nodes (30): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored(), analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence() (+22 more)

### Community 48 - "handleGo"
Cohesion: 0.07
Nodes (40): applyEditing(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), canRestoreManualEditElement(), captureAndEmit(), checkpointPayload(), copyEditContainerContext() (+32 more)

### Community 49 - "checkQuality"
Cohesion: 0.09
Nodes (29): checkElementOversizedH1(), checkElementOversizedH1DOM(), checkElementQuality(), checkElementQualityDOM(), checkKickerAboveHeading(), checkKickerAboveHeadingDOM(), checkKickerAboveHeadingFromDoc(), checkNumberedSectionLabels() (+21 more)

### Community 50 - "runHook"
Cohesion: 0.15
Nodes (29): ALLOWED_EXTS, appendDesignSystemNote(), appendDesignSystemNoteOnce(), bumpEditCount(), commitFooterShown(), consumeSessionNoticeFlag(), dedupeAgainstCache(), depthIsSet() (+21 more)

### Community 51 - "live-poll.mjs"
Cohesion: 0.16
Nodes (27): completionAckForAcceptResult(), completionTypeForAcceptResult(), PREVIEW_MODES_WITHOUT_SOURCE_MARKERS, augmentEventWithAcceptHandling(), buildAcceptScriptArgs(), buildPollReplyPayload(), completeAcceptHandling(), EVENT_TYPES_NEEDING_AGENT_REPLY (+19 more)

### Community 52 - "content.js"
Cohesion: 0.17
Nodes (28): ARABIC_WEEKDAYS, ATS_DOMAINS, cleanEmailBody(), cleanText(), detectPlatform(), detectWebmailAccountEmail(), domainFromEmail(), drainPendingItemsToTracklet() (+20 more)

### Community 53 - "popup.js"
Cohesion: 0.11
Nodes (19): checkForDuplicates(), cleanDomain(), extractAtsSlugFromUrl(), extractCompanyFromAts(), extractDomainFromUrl(), getDomain(), getDomainFallback(), handleLogEmail() (+11 more)

### Community 54 - "ContactsView.tsx"
Cohesion: 0.16
Nodes (22): ContactCardGrid(), ContactEmptyState(), ContactEmptyStateProps, ContactTable(), ContactTableProps, FollowUpBadge(), FollowUpBadgeProps, FollowUpControl() (+14 more)

### Community 55 - "discoverTargetCandidates"
Cohesion: 0.11
Nodes (28): directChildDirs(), discoverRootsForPattern(), discoverTargetCandidates(), escapeRegExp(), expandSimplePattern(), findTargetExample(), hasFallbackWorkspaceChildren(), isCandidateProjectRoot() (+20 more)

### Community 56 - "roots.mjs"
Cohesion: 0.16
Nodes (27): CANDIDATE_SCAN_IGNORED, consumeTargetArg(), CONTEXT_FALLBACK_DIRS, DESIGN_NAMES, DEV_CONFIG_MARKERS, discoverAppCandidates(), enterLiveRoot(), exists() (+19 more)

### Community 57 - "collectBrowserFindings"
Cohesion: 0.10
Nodes (27): browserFindingsFromMap(), checkEdgeFlushCardsDOM(), checkElementBlinkingCursorDOM(), checkElementMotion(), checkElementMotionDOM(), checkElementTextOverflowDOM(), checkEmDashOveruse(), checkEmDashOveruseDOM() (+19 more)

### Community 58 - "checkHtmlPatterns"
Cohesion: 0.12
Nodes (27): ANIMATION_VALUE_KEYWORDS, buildHtmlPatternCorpora(), checkHtmlPatterns(), collectCssCustomProps(), collectMarqueeKeyframes(), collectPulseKeyframes(), cssLengthToPx(), cssTextHasDarkRootBg() (+19 more)

### Community 59 - "staleness.mjs"
Cohesion: 0.16
Nodes (24): PRODUCT_DEPRECATED_SECTIONS, PRODUCT_V4_SECTIONS, productStampLine(), readSidecarSchemaVersion(), stampProductSchema(), BUILD_PATH_VALUES, checkBuildPathUnset(), checkConfig() (+16 more)

### Community 60 - "types.ts"
Cohesion: 0.16
Nodes (16): DEFAULT_FOLLOWUP_TEMPLATES, LOCAL_STORAGE_KEYS, activeConfig, auth, db, googleProvider, isFirebaseConfigured, appendStatusHistory() (+8 more)

### Community 61 - "session-store.mjs"
Cohesion: 0.11
Nodes (21): safeSessionId(), missedCompletionFromSnapshot(), applyEvent(), baseSnapshot(), COMPLETED_PHASES, deriveRenderState(), GENERATION_FENCED_PHASES, getJournalPath() (+13 more)

### Community 62 - "resolveLiveInjectionAnchor"
Cohesion: 0.11
Nodes (27): acceptedDomAlreadyClean(), applyOriginalAttrsToSvelteAnchor(), buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts() (+19 more)

### Community 63 - "handleManualEditActivity"
Cohesion: 0.17
Nodes (26): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+18 more)

### Community 64 - "linkUtils.ts"
Cohesion: 0.16
Nodes (17): FormattedEmailBody(), FormattedEmailBodyProps, LinkifiedText(), LinkifiedTextProps, EmailBlock, normalizeEmailContent(), parseEmailBlocks(), parseInlineStyles() (+9 more)

### Community 65 - "TopBar.tsx"
Cohesion: 0.09
Nodes (23): FilterOption, FilterSelectDropdown(), FilterSelectDropdownProps, DATE_RANGES, EMPLOYMENT_TYPES, MobileFilterDrawer(), MobileFilterDrawerProps, PLATFORMS (+15 more)

### Community 66 - "editorBlocks.ts"
Cohesion: 0.16
Nodes (24): absorb(), blockInnerHtml(), placeCaretInHost(), swapBlock(), transformBlockAtCaret(), TransformOptions, ensurePlaceable(), exitCalloutOnEnter() (+16 more)

### Community 67 - "live-status.mjs"
Cohesion: 0.18
Nodes (21): readLiveServerInfo(), FORBIDDEN, verifyAcceptedFile(), completeCli(), completeThroughServer(), parseArgs(), readServerInfo(), collectManualApplyFiles() (+13 more)

### Community 68 - "richTextMarkdownUtils.ts"
Cohesion: 0.19
Nodes (18): sanitizePastedHtml(), snapshotCaret(), getTemplateById(), NOTE_TEMPLATES, canonicalizeMarkdown(), compareCanonical(), domNodeToMarkdown(), escapeHtml() (+10 more)

### Community 69 - "accept-css.mjs"
Cohesion: 0.20
Nodes (23): bakeParamValues(), collectAllSelectors(), collectSelectorsFromNodes(), escapeRegExp(), formatBody(), isToggleOn(), normalizeSelector(), normalizeToggleForVar() (+15 more)

### Community 70 - "manual-edit-routes.mjs"
Cohesion: 0.19
Nodes (20): args, cwd, pageUrlFilter, remaining, compactManualLogText(), summarizeManualApplyFailures(), summarizeManualDiagnostics(), summarizeManualLogFile() (+12 more)

### Community 71 - "insert-ui.mjs"
Cohesion: 0.11
Nodes (10): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+2 more)

### Community 72 - "svelte-ast.mjs"
Cohesion: 0.22
Nodes (20): Analysis, analyzeAttributes(), analyzeFragment(), analyzeNode(), analyzeSvelteMarkup(), applyReplacements(), classifyEachKey(), classifyRoots() (+12 more)

### Community 73 - "parseAnyColor"
Cohesion: 0.12
Nodes (23): checkCreamPalette(), checkTextOcclusionDOM(), clamp01(), colorFunctionToRgb(), creamFromClassList(), decodeSrgbChannel(), elementDirectText(), encodeSrgbChannel() (+15 more)

### Community 74 - "detect-url.mjs"
Cohesion: 0.20
Nodes (20): createBrowserDetector(), detectUrl(), launchBrowser(), measureContentHiddenAfterReveal(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), captureVisualContrastCandidate(), compareScreenshotContrast() (+12 more)

### Community 75 - "editor/editorDom.ts"
Cohesion: 0.15
Nodes (16): AnchorRect, applySelection(), caretCharOffset(), CaretSnapshot, charOffsetToRange(), cleanPastedElement(), computeMenuPosition(), isAllowedUrl() (+8 more)

### Community 76 - "lib/editor/editorActions.tsx"
Cohesion: 0.15
Nodes (15): EDITOR_ACTIONS, EditorActionId, ensureSelection(), filterActions(), getActionById(), insertCodeBlock(), menuActions(), EditorActionContext (+7 more)

### Community 77 - "webmailCompanion.test.ts"
Cohesion: 0.15
Nodes (17): ApplicationSummary, ARABIC_WEEKDAYS, ATS_DOMAINS, cleanDomain(), extractAtsSlugFromUrl(), extractCompanyFromAts(), extractDomainFromUrl(), formatDateParts() (+9 more)

### Community 78 - "impeccable-paths.mjs"
Cohesion: 0.19
Nodes (19): resolveProjectRoot(), firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+11 more)

### Community 79 - "serve-question.mjs"
Cohesion: 0.12
Nodes (10): browserOpenCommand(), openSystemBrowser(), esc(), localImages, page(), payloadPath, portArg, QUESTION_DIR (+2 more)

### Community 80 - "live-inject.mjs"
Cohesion: 0.11
Nodes (34): describeInjectArtifacts(), frameworkIgnorePatterns(), resolveFramework(), applyNuxtLiveAdapter(), buildNuxtPlugin(), detectNuxtProject(), nuxt, removeNuxtLiveAdapter() (+26 more)

### Community 81 - "FollowUpModal.tsx"
Cohesion: 0.17
Nodes (14): FollowUpComposer(), FollowUpComposerProps, FollowUpModal(), FollowUpRecipientSelector(), FollowUpRecipientSelectorProps, RecipientOption, FollowUpTemplateBar(), FollowUpTemplateBarProps (+6 more)

### Community 82 - "tanstack-adapter.mjs"
Cohesion: 0.23
Nodes (15): applyTanStackLiveAdapter(), buildTanStackLiveRootComponent(), detectTanStackStartProject(), escapeRegExp(), findRootRouteFile(), insertAfterLastImport(), isManagedComponent(), packageHasTanStackStart() (+7 more)

### Community 83 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 84 - "filterFindings"
Cohesion: 0.16
Nodes (18): ADVISORY_RULES, cleanIgnoreValueDisplay(), extractFindingIgnoreValue(), extractFindingIgnoreValueRaw(), extractMotionIgnoreValue(), filterFindings(), findingMatchesScopedIgnoreFile(), formatFindingIgnoreHint() (+10 more)

### Community 85 - "sveltekit-adapter.mjs"
Cohesion: 0.24
Nodes (16): applySvelteKitLiveAdapter(), buildSvelteLiveRootComponent(), defaultSvelteLayout(), detectSvelteKitProject(), ensureSvelteLiveRootComponent(), escapeRegExp(), fileIncludes(), findSvelteKitAppHtml() (+8 more)

### Community 86 - "resolveProject"
Cohesion: 0.15
Nodes (17): contextSourcePath(), contextSourceStatus(), findMonorepoRoot(), firstExisting(), hasGitBoundary(), isPathInside(), isPathInsideOrEqual(), nearestPackageRootBetween() (+9 more)

### Community 87 - "critique-storage.mjs"
Cohesion: 0.25
Nodes (14): coerceSlug(), listSnapshots(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readLatestSnapshotAcrossTargets(), readLatestSnapshotMatching() (+6 more)

### Community 88 - "onAnnotDown"
Cohesion: 0.18
Nodes (19): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords() (+11 more)

### Community 89 - "event-validation.mjs"
Cohesion: 0.25
Nodes (16): AGENT_PHASE_SET, FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidMountVariant(), isValidVariantId(), validateAnnotationFields(), validateEvent() (+8 more)

### Community 90 - "context-signals.mjs"
Cohesion: 0.22
Nodes (14): extractPlatform(), extractSectionValue(), cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals(), hasCode() (+6 more)

### Community 91 - "template-extensions.mjs"
Cohesion: 0.19
Nodes (13): extensionCache, LIVE_TEMPLATE_EXTENSIONS, matchesTemplateExtension(), mergeExtensions(), normalizeExtensionEntries(), readLiveTemplateExtensions(), resolveLiveTemplateExtensions(), safeReadJson() (+5 more)

### Community 92 - "sampleCssBackground"
Cohesion: 0.20
Nodes (15): blendRgba(), clampByte(), firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken() (+7 more)

### Community 93 - "detect-utils.mjs"
Cohesion: 0.34
Nodes (11): astro, detectAstroProject(), fileExists(), findConfigFile(), firstExistingFile(), hasAnyDependency(), literalConfigFiles(), readPackageDeps() (+3 more)

### Community 94 - "frameworks/index.mjs"
Cohesion: 0.15
Nodes (12): COMMENT_SYNTAXES, FRAMEWORKS, INJECT_KINDS, PATCH_UNDOERS, PREVIEW_MODES, SOURCE_TRAIT_DEFAULTS, STYLE_MODES, nextjs (+4 more)

### Community 95 - "dedupUtils.ts"
Cohesion: 0.14
Nodes (23): EmailLogCard(), EmailLogCardProps, EmailLogSection(), EmailLogSectionProps, formatLocalDate(), findDuplicateApplications(), getApplicationDedupKey(), mergeAllDuplicateGroups() (+15 more)

### Community 96 - "common.ps1"
Cohesion: 0.22
Nodes (10): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-Python3Command(), Get-RepoRoot(), Resolve-SpecifyInitDir() (+2 more)

### Community 98 - "pin.mjs"
Cohesion: 0.23
Nodes (11): CODEX_HARNESSES, commandPrefixForSkillsDir(), __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin() (+3 more)

### Community 99 - "ErrorBoundary"
Cohesion: 0.17
Nodes (3): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState

### Community 100 - "surface-briefs.mjs"
Cohesion: 0.44
Nodes (9): getSurfaceBriefDir(), listSurfaceBriefs(), normalizeSurfaceTarget(), parseSurfaceBrief(), resolveSurfaceBrief(), surfaceBriefPathForTarget(), writeSurfaceBrief(), main() (+1 more)

### Community 101 - "live.mjs"
Cohesion: 0.32
Nodes (11): __dirname, ensureServerRunning(), globToRegex(), globToRegex(), resolveFiles(), liveCli(), relOrNull(), runScript() (+3 more)

### Community 102 - "browser-script-parts.mjs"
Cohesion: 0.21
Nodes (9): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), loadBrowserScripts(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS (+1 more)

### Community 103 - "journal.mjs"
Cohesion: 0.36
Nodes (11): clearInjectJournal(), healArtifact(), healInjectJournal(), injectJournalPath(), insideProject(), normalizeRel(), pruneEmptyDirs(), readIfPresent() (+3 more)

### Community 104 - "generation-preflight.mjs"
Cohesion: 0.30
Nodes (10): buildGenerationPreflight(), compactError(), execFileAsync, insertTarget(), normalizeTarget(), replaceTarget(), runGenerationPreflight(), sourceResolutionCache (+2 more)

### Community 105 - "staleness-notice.mjs"
Cohesion: 0.33
Nodes (10): appendStalenessDirective(), designSidecarCandidatesFor(), buildStalenessDirective(), cachePath(), filterFreshFindings(), pruneCache(), readCache(), readJson() (+2 more)

### Community 106 - "readConfig"
Cohesion: 0.20
Nodes (11): applyConfigSource(), applyDetectorConfigSource(), cloneDefaultConfig(), detectorSection(), hookSection(), ignoreValueFilesKey(), mergeIgnoreValues(), numberOr() (+3 more)

### Community 107 - "palette.mjs"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 108 - "instructions.mjs"
Cohesion: 0.40
Nodes (9): acceptInstructions(), bootInstructions(), deferredWrapperInstructions(), generateInstructions(), insertScaffoldInstructions(), instructionsForEvent(), pollCmd(), replyCmd() (+1 more)

### Community 109 - "target-args.mjs"
Cohesion: 0.36
Nodes (5): parseCliOptions(), parseTargetOptions(), parseTargetPath(), TargetArgError, resolveLiveTarget()

### Community 110 - "checkElementGptBorderShadowDOM"
Cohesion: 0.32
Nodes (8): borderColorsFromStyle(), borderWidthsFromStyle(), checkElementGptBorderShadow(), checkElementGptBorderShadowDOM(), checkGptThinBorderWideShadow(), cssColorAlpha(), shadowLayerAlpha(), shadowMaxBlurPx()

### Community 111 - "source-lock.mjs"
Cohesion: 0.50
Nodes (7): isLiveServerPidReachable(), clearStaleLock(), readLock(), releaseOwnLock(), sleepSync(), sourceLockPath(), withSourceLockSync()

### Community 112 - "BORDER_SAFE_TAGS"
Cohesion: 0.43
Nodes (7): checkBorders(), checkElementBorders(), checkElementBordersDOM(), isNeutralColor(), isStatusContextElement(), isTabContextElement(), BORDER_SAFE_TAGS

### Community 113 - "background.js"
Cohesion: 0.43
Nodes (5): convertEmailLogToFirestoreMap(), pushEmailLogToFirestore(), pushToFirestoreDirectly(), saveAndSyncApplication(), saveAndSyncEmailLog()

### Community 114 - "isScreenReaderOnlyTextStyle"
Cohesion: 0.47
Nodes (6): clippedByInset(), clippedByRect(), expandBoxShorthand(), firstMetricLengthPx(), isScreenReaderOnlyTextStyle(), metricLengthPx()

### Community 116 - "checkHeroEyebrow"
Cohesion: 0.40
Nodes (5): checkElementHeroEyebrowDOM(), checkHeroEyebrow(), domAccentDashPseudo(), isAccentColor(), isNumberedSectionLabelCandidate()

### Community 118 - "detect.mjs"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

### Community 119 - "checkElementRadialSpotlightDOM"
Cohesion: 0.67
Nodes (4): checkElementRadialSpotlight(), checkElementRadialSpotlightDOM(), elementGradientValue(), spotlightLabel()

### Community 120 - "hook.mjs"
Cohesion: 0.83
Nodes (3): isStopEvent(), main(), readStdin()

## Knowledge Gaps
- **343 isolated node(s):** `here`, `API_BASE`, `API_TIMEOUT_MS`, `localStates`, `SEED_MODES` (+338 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `payload()` connect `runHook` to `hook-lib.mjs`, `dedupUtils.ts`?**
  _High betweenness centrality (0.307) - this node is a cross-community bridge._
- **Why does `syncPendingAppsFromStorage()` connect `dedupUtils.ts` to `runHook`?**
  _High betweenness centrality (0.307) - this node is a cross-community bridge._
- **Why does `el()` connect `el` to `live-browser.js`, `checks.mjs`, `connectSSE`, `injected/index.mjs`, `design-system.mjs`, `detect-antipatterns-browser.js`, `svelte-ast.mjs`, `parseRgb`, `initGlobalBar`, `setLiveState`, `initPageChat`, `css-cascade.mjs`, `detect-html.mjs`, `collectBrowserFindings`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `el()` (e.g. with `collectVisualContrastCandidates()` and `renderBrowserFindings()`) actually correct?**
  _`el()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **What connects `here`, `API_BASE`, `API_TIMEOUT_MS` to the rest of the system?**
  _343 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `live-browser.js` be split into smaller, more focused modules?**
  _Cohesion score 0.028661479365704717 - nodes in this community are weakly interconnected._
- **Should `checks.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0398019801980198 - nodes in this community are weakly interconnected._