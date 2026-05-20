# Resource Limits

Adversarial probes for *correctness under load* — not perf benchmarks. Probes target the threshold where logic breaks.

## Large-N probes — threshold finding

```python
# probe: function works for 10 records but breaks at 10_000 (recursive call hits stack depth)
def test_compute_dependency_tree_10k_nodes():
    nodes = [Node(id=i, parent=i-1 if i > 0 else None) for i in range(10_000)]
    result = compute_tree(nodes)
    assert len(result.depth_map) == 10_000   # currently: RecursionError
```

## File handle / connection exhaustion

```python
# probe: loop opens file/connection per item, never closes — exhausts handles at N items
def test_process_batch_closes_handles():
    files = ['/tmp/f' + str(i) for i in range(1024)]
    process_batch(files)   # currently: OSError: too many open files
    # fix: process_batch should use context manager / `with` per item
```

## Large single payload probes

```python
# probe: streaming-vs-buffered handler choice — 100 MB upload buffers all in RAM
def test_upload_100mb_file_streams():
    with open('/tmp/100mb', 'wb') as f:
        f.write(b'x' * (100 * 1024 * 1024))
    client.upload('/tmp/100mb')
    # currently: worker memory spikes to 100 MB — no streaming
```

## Timeout probes

```python
# probe: dep call has no timeout — slow upstream hangs entire request
def test_external_api_call_has_timeout():
    with mock.patch('requests.get') as m:
        m.side_effect = lambda *_, **kw: time.sleep(60)
        with pytest.raises(TimeoutError):
            fetch_remote_data()   # currently hangs forever — no timeout kwarg
```

## Pagination edge probes

```python
# probe: page exactly equal to total — last page has 0 items but cursor says "more"
def test_paginate_exact_multiple():
    items = list(range(100))   # exactly 10 pages of 10
    pages = list(paginate(items, per_page=10))
    assert len(pages[-1]) == 10   # currently: returns extra empty page after
```

## Empty last page probes

```python
# probe: cursor token returns empty result; current code treats as "still more"
def test_pagination_terminates_on_empty():
    pages = list(paginate_remote('cursor-at-end'))
    assert pages[-1].items == []
    assert pages[-1].next_cursor is None   # currently loops forever — cursor not None
```

## Anti-pattern reminders

- This isn't perf testing. Probes show *correctness failure* under load — wrong result, crash, hang, leak. If "it's just slow" → defer.
- Threshold finding: probe at 1, 10, 100, 10_000, 1_000_000. Report the lowest N that breaks.
- Don't generate probes that require external infrastructure (real DB at scale, real network) unless the project's tests already do.
