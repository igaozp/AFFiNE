import type { FlagInfo } from './types';

const isNotStableBuild = BUILD_CONFIG.appBuildType !== 'stable';
const isDesktopEnvironment = BUILD_CONFIG.isElectron;
const isCanaryBuild = BUILD_CONFIG.appBuildType === 'canary';
const isMobile = BUILD_CONFIG.isMobileEdition;

export const AFFINE_FLAGS = {
  enable_ai: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-ai.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-ai.description',
    hide: true,
    configurable: true,
    defaultState: true,
  },
  enable_ai_network_search: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-ai-network-search.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-ai-network-search.description',
    configurable: true,
    defaultState: false,
  },
  enable_database_full_width: {
    category: 'blocksuite',
    bsFlag: 'enable_database_full_width',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-database-full-width.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-database-full-width.description',
    configurable: isCanaryBuild,
  },
  enable_database_attachment_note: {
    category: 'blocksuite',
    bsFlag: 'enable_database_attachment_note',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-database-attachment-note.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-database-attachment-note.description',
    configurable: isNotStableBuild,
  },
  enable_block_query: {
    category: 'blocksuite',
    bsFlag: 'enable_block_query',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-block-query.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-block-query.description',
    configurable: isCanaryBuild,
  },
  enable_synced_doc_block: {
    category: 'blocksuite',
    bsFlag: 'enable_synced_doc_block',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-synced-doc-block.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-synced-doc-block.description',
    configurable: false,
    defaultState: true,
  },
  enable_edgeless_text: {
    category: 'blocksuite',
    bsFlag: 'enable_edgeless_text',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-edgeless-text.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-edgeless-text.description',
    configurable: false,
    defaultState: true,
  },
  enable_color_picker: {
    category: 'blocksuite',
    bsFlag: 'enable_color_picker',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-color-picker.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-color-picker.description',
    configurable: false,
    defaultState: true,
  },
  enable_ai_chat_block: {
    category: 'blocksuite',
    bsFlag: 'enable_ai_chat_block',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-ai-chat-block.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-ai-chat-block.description',
    configurable: false,
    defaultState: true,
  },
  enable_ai_onboarding: {
    category: 'blocksuite',
    bsFlag: 'enable_ai_onboarding',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-ai-onboarding.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-ai-onboarding.description',
    configurable: false,
    defaultState: true,
  },
  enable_mind_map_import: {
    category: 'blocksuite',
    bsFlag: 'enable_mind_map_import',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-mind-map-import.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-mind-map-import.description',
    configurable: false,
    defaultState: true,
  },
  enable_emoji_folder_icon: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-emoji-folder-icon.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-emoji-folder-icon.description',

    feedbackType: 'discord',
    feedbackLink:
      'https://discord.com/channels/959027316334407691/1280014319865696351/1280014319865696351',
    configurable: true,
    defaultState: true,
  },
  enable_emoji_doc_icon: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-emoji-doc-icon.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-emoji-doc-icon.description',
    feedbackType: 'discord',
    feedbackLink:
      'https://discord.com/channels/959027316334407691/1280014319865696351',
    configurable: true,
    defaultState: true,
  },
  enable_editor_settings: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-editor-settings.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-editor-settings.description',
    configurable: false,
    defaultState: true,
  },
  enable_offline_mode: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-offline-mode.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-offline-mode.description',
    configurable: isDesktopEnvironment,
    defaultState: false,
  },
  enable_theme_editor: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-theme-editor.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-theme-editor.description',
    configurable: isCanaryBuild && !isMobile,
    defaultState: isCanaryBuild,
  },
  enable_local_workspace: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-local-workspace.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-local-workspace.description',
    configurable: isCanaryBuild,
    defaultState: isDesktopEnvironment || isCanaryBuild,
  },
  enable_advanced_block_visibility: {
    category: 'blocksuite',
    bsFlag: 'enable_advanced_block_visibility',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-advanced-block-visibility.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-advanced-block-visibility.description',
    configurable: true,
    defaultState: false,
  },
  enable_mobile_keyboard_toolbar: {
    category: 'blocksuite',
    bsFlag: 'enable_mobile_keyboard_toolbar',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-mobile-keyboard-toolbar.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-mobile-keyboard-toolbar.description',
    configurable: false,
    defaultState: isMobile,
  },
  enable_mobile_linked_doc_menu: {
    category: 'blocksuite',
    bsFlag: 'enable_mobile_linked_doc_menu',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-mobile-linked-doc-menu.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-mobile-linked-doc-menu.description',
    configurable: false,
    defaultState: isMobile,
  },
  enable_multiple_cloud_servers: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-multiple-cloud-servers.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-multiple-cloud-servers.description',
    configurable: false,
    defaultState: isDesktopEnvironment,
  },
  enable_mobile_edgeless_editing: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-mobile-edgeless-editing.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-mobile-edgeless-editing.description',
    configurable: isMobile,
    defaultState: false,
  },
  enable_pdf_embed_preview: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-pdf-embed-preview.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-pdf-embed-preview.description',
    configurable: !isMobile,
    defaultState: false,
  },
  // TODO(@CatsJuice): remove this flag when ready
  enable_template_doc: {
    category: 'affine',
    displayName: 'Enable template doc',
    description:
      'Allow users to mark a doc as a template, and create new docs from it',
    configurable: true,
    defaultState: isCanaryBuild,
  },
  // TODO(@L-Sun): remove this flag when ready
  enable_page_block: {
    category: 'blocksuite',
    bsFlag: 'enable_page_block',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-page-block-header.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-page-block-header.description',
    configurable: isCanaryBuild,
    defaultState: isCanaryBuild,
  },
  enable_editor_rtl: {
    category: 'affine',
    displayName:
      'com.affine.settings.workspace.experimental-features.enable-editor-rtl.name',
    description:
      'com.affine.settings.workspace.experimental-features.enable-editor-rtl.description',
    configurable: isCanaryBuild,
    defaultState: false,
  },
} satisfies { [key in string]: FlagInfo };

// oxlint-disable-next-line no-redeclare
export type AFFINE_FLAGS = typeof AFFINE_FLAGS;
