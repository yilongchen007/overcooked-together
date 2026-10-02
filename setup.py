# Bundle the same simulator files in wheels; no second implementation.
from pathlib import Path
from setuptools import setup
from setuptools.command.build_py import build_py
class BuildWithSimulator(build_py):
    def run(self):
        super().run()
        destination = Path(self.build_lib) / "overcooked_together" / "js"
        destination.mkdir(parents=True, exist_ok=True)
        for name in ("content.js", "engine.js", "partner.js", "bridge.mjs"):
            self.copy_file(str(Path(__file__).parent / "src" / name), str(destination / name))
        (destination / "package.json").write_text('{"type":"module"}\n')
setup(cmdclass={"build_py": BuildWithSimulator})
