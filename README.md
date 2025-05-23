# Check Sftp Files Action

This action checks if a list of files separated by comma exists on a remote server using SFTP.

## Inputs

### `host`

**Required** The host of the remote server.

### `port`

The port of the remote server. Default is `22`.

### `username`

**Required** The username of the remote server.

### `password`

**Required** The password of the remote server.

### `file-names`

The file names to check on the remote server, separated by commas. Default is ``.
Example: `registry.json,package.json`

### `file-patterns`

The file patterns to check on the remote server, separated by commas. Default is ``.
Example: `^registry.*\.json$,^package.*\.json$`

### `remote-dir-path`

**Required** The remote directory path to check files in.

### `fail-if-no-files`

Specifies whether the action should fail if files are not found. Default is `'false'`. Set to `'true'` to enable this behavior.
If set to `'true'`:
- When `file-patterns` are used, the action fails if any of the specified patterns do not match any files.
- When `file-names` are used, the action fails if any of the specified files are not found.
- If no files are found at all, the action fails regardless of the input.


## Outputs

### `file-names`

The file names that were checked. Array of strings.

### `file-names-not-found`

If file-names input is provided, this output will contain the file names that were not found on the remote server. Array of strings.

### `file-patterns`

The file patterns that were checked. Array of strings.

### `file-patterns-not-found`

If file-patterns input is provided, this output will contain the file patterns that were not found on the remote server. Array of strings.

## Example usage

```yaml
uses: juniorUsca/check-sftp-files-action@v1
with:
  host: 'example.com'
  port: '22'
  username: 'user'
  password: 'password'
  file-names: 'registry.json,package.json'
  file-patterns: '^registry.*\.json$,^package.*\.json$'
  remote-dir-path: '/path/to/remote/dir'
  fail-if-no-files: 'true'
```
