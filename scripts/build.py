import pathlib,shutil
root=pathlib.Path(__file__).resolve().parent.parent
shutil.rmtree(root/'dist',ignore_errors=True)
shutil.copytree(root/'public',root/'dist')
print('Built static platform in dist/')
