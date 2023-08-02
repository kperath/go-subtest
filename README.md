# go-subtest

Quickly generate json required in your launch.json for your Go subtests.

<image alt="gopher" src="https://i.imgur.com/HZMjcgR.png" height="250"/>

## Logic on adding a subtest

1. Check if current file is a Go file
1. Check if function is a Go test function (starts with 'Test')
1. Checks if cursor is on a string and assumes this is the title of the subtest (this is the user's responsibility)
1. Generates launch test configuration with the name function test name + sub test name
1. Adds it to the launch.json file in the workspace (or if `useClipboard` is enabled, the JSON is copied to the clipboard instead)

## Demo

<image alt="demo (gif)" src="https://i.imgur.com/EFKEid2.gif" height="500"/>

## Requirements

Requires the [Go VSCode extension](https://github.com/golang/vscode-go) in order to parse symbols and determine you are in a test function.

## Limitations

This extension **does not support** [multi-root workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces) and will just use the one it retrieves first from the API to determine the launch.json file it needs to inject to.

## Extension Settings

This extension contributes the following settings:

- `"go-subtest.useClipboard"`: false
  When enabled, pastes the generated json for the subtest into your clipboard instead of adding it directly to your launch.json (for those that want to self manged)

## Known Issues

Debug logs show an error: `Failed to list imports: {err}` but this doesn't seem to impact the extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.1.0

Initial release of go-subtest

- add your subtest to launch.json or copy to your clipboard with the setting `"go-subtest.useClipboard": true`
- go to your subtest config in launch.json

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy!**
