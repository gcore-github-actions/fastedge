# Deployment

1. Create a new branch (e.g. `git checkout -b feature/patch-dependencies` )

2. Update the `./src`

3. Test & package the code:

```sh
npm run all
```

4. (Optional) Test your action locally

```sh
npm run local-action:app
```

5. Commit your changes:

```sh
git add .
git commit -m "My action dependencies have been updated"
```

6. Push your changes:

```sh
git push -u origin feature/patch-dependencies
```

7. Create a pull request to `main` and get approval.

8. Once all tests have `passed` and you have merged the PR to main:

- `git checkout main`
- `git pull`
- `./scripts/release` # This will create release tags

9. Open the
   [Releases](https://github.com/gcore-github-actions/fastedge/releases) page
   and go to the draft release.

10. Make sure the `Publish this release to the GitHub Marketplace` checkbox is
    checked and changelog is correct.

11. Publish the new release.

12. Move the major version tag (e.g. v1) to the latest patch release.
