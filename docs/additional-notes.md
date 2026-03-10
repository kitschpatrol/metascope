# Additional notes

## Possible sources

Not yet implemented, but under consideration:

| Ecosystem       | Organization or Registry                                                                      | Source Specifications                                                                                                                                          | CodeMeta Crosswalk                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| .NET            | [NuGet](https://www.nuget.org/)                                                               | [`*.nuspec`](https://learn.microsoft.com/nuget/reference/nuspec)                                                                                               | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'NuGet')                                              |
| Scholarly       | [Citation File Format (v1.2.0)](https://github.com/citation-file-format/citation-file-format) | [`CITATION.cff`](https://github.com/citation-file-format/citation-file-format/blob/main/CITATION.cff)                                                          | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Citation File Format (1.2.0)')                       |
| Scholarly       | [DOAP (Description of a Project)](https://github.com/edumbill/doap)                           | [`doap.rdf`](https://github.com/edumbill/doap/blob/master/doap.rdf)                                                                                            | [Yes](https://codemeta.github.io/crosswalk/doap/ 'DOAP')                                                                |
| Astronomy       | [ASCL](https://ascl.net/)                                                                     | [`pom.xml`](https://maven.apache.org/pom.html)                                                                                                                 | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'ASCL')                                               |
| Biomedical      | [SciCrunch Registry](https://scicrunch.org/)                                                  | _platform metadata_                                                                                                                                            | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'SciCrunchRegistry')                                  |
| Clojure         | [Leiningen](https://github.com/technomancy/leiningen)                                         | [`project.clj`](https://github.com/technomancy/leiningen/blob/master/doc/PROFILES.md)                                                                          | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Leiningen (Clojure)')                                |
| Dart            | [pub.dev](https://pub.dev/)                                                                   | [`pubspec.yaml`](https://dart.dev/tools/pub/pubspec)                                                                                                           | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Pubspec')                                            |
| Data Catalog    | [W3C DCAT-2](https://www.w3.org/TR/vocab-dcat-2/)                                             | [`*.ttl`, `*.rdf`, `*.jsonld`](https://www.w3.org/TR/vocab-dcat-2/)                                                                                            | [Yes](https://codemeta.github.io/crosswalk/dcat-2/ 'DCAT-2')                                                            |
| Data Catalog    | [W3C DCAT-3](https://www.w3.org/TR/vocab-dcat-2/)                                             | [`*.ttl`, `*.rdf`, `*.jsonld`](https://www.w3.org/TR/vocab-dcat-2/)                                                                                            | [Yes](https://codemeta.github.io/crosswalk/dcat-3/ 'DCAT-3')                                                            |
| Debian          | [Debian Package](https://www.debian.org/distrib/packages)                                     | [`debian/control`](https://www.debian.org/doc/manuals/debian-policy/ch-controlfields.html)                                                                     | [Yes](https://codemeta.github.io/crosswalk/debian/ 'Debian Package')                                                    |
| Earth Science   | [CSDMS Model Metadata](https://csdms.colorado.edu/)                                           | [`model_metadata.xml`](https://csdms.colorado.edu/wiki/Model_Metadata_Specification)                                                                           | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'csdms')                                              |
| Geoscience      | [OntoSoft Software Repository](https://ontosoft.org/portal/#list)                             | [`*.json`, \*.xml\`](https://ontosoft-earthcube.github.io/ontosoft/ontosoft%20ontology/v1.0.1/doc/)                                                            | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'OntoSoft')                                           |
| Geoscience      | [USGS Model Catalog](https://data.usgs.gov/modelcatalog/)                                     | _portal metadata_                                                                                                                                              | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'usgs-modelcatalog')                                  |
| Geospatial      | [ISO 19115-1:2014](https://www.iso.org/standard/53798.html)                                   | [`*.xml`](https://standards.iso.org/ittf/PubliclyAvailableStandards/iso_19115-1_2014.html)                                                                     | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'ISO 19115-1:2014 Geographic information - Metadata') |
| Haskell         | [Hackage](https://hackage.haskell.org/)                                                       | [`*.cabal`](https://cabal.readthedocs.io/en/latest/specification.html)                                                                                         | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Cabal (Haskell)')                                    |
| Julia           | [Pkg](https://pkgdocs.julialang.org/v1/)                                                      | [`Project.toml`](https://github.com/JuliaRegistries/General/blob/master/Registry/Package.toml)                                                                 | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Julia Project.toml')                                 |
| Knowledge Graph | [Wikidata](https://www.wikidata.org/)                                                         | _Wikidata entity model_                                                                                                                                        | [Yes](https://codemeta.github.io/crosswalk/wikidata/ 'Wikidata')                                                        |
| Library         | [MODS](https://www.loc.gov/standards/mods/)                                                   | [`*.xml`](https://www.loc.gov/standards/mods/)                                                                                                                 | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'MODS')                                               |
| Licensing       | [SPDX 2.3](https://spdx.org/specifications)                                                   | [`*.spdx`, `*.spdx.json`, `*.spdx.rdf`](https://spdx.org/specifications)                                                                                       | [Yes](https://codemeta.github.io/crosswalk/spdx-2-3/ 'SPDX 2.3')                                                        |
| Life Sciences   | [bio.tools](https://bio.tools/)                                                               | [`biotools.json`](https://bio.tools/schema)                                                                                                                    | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'bio.tools')                                          |
| Mathematics     | [swMATH](https://swmath.org/)                                                                 | _portal metadata_                                                                                                                                              | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'swMATH')                                             |
| Octave          | [Octave Package](https://octave.sourceforge.io/)                                              | [`DESCRIPTION`](https://octave.sourceforge.io/pack/pack.html)                                                                                                  | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Octave')                                             |
| Perl            | [CPAN::Meta](https://www.cpan.org/)                                                           | [`META.json`](https://metacpan.org/dist/CPAN-Meta/source/lib/CPAN/Meta/Spec.pm) [`META.yml`](https://metacpan.org/dist/CPAN-Meta/source/lib/CPAN/Meta/Spec.pm) | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Perl Module Description (CPAN::Meta)')               |
| R               | [R Package Description](https://cran.r-project.org/)                                          | [`DESCRIPTION`](https://cran.r-project.org/doc/manuals/r-release/R-exts.html#DESCRIPTION-file)                                                                 | [Yes](https://codemeta.github.io/crosswalk/r/ 'R Package Description')                                                  |
| Scholarly       | [BibTeX](https://www.bibtex.org)                                                              | [`*.bib`](https://www.bibtex.org/Format/)                                                                                                                      | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'BibTeX (@softwareversion)')                          |
| Scholarly       | [DataCite Metadata Schema](https://datacite.org/schema/kernel-4)                              | [`datacite.xml`](https://schema.datacite.org/meta/kernel-4)                                                                                                    | [Yes](https://codemeta.github.io/crosswalk/datacite/ 'DataCite')                                                        |
| Scholarly       | [Dublin Core](https://www.dublincore.org/specifications/dublin-core/)                         | [`*.xml`, `*.rdf`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)                                                                          | [Yes](https://codemeta.github.io/crosswalk/dublincore/ 'Dublin Core')                                                   |
| Scholarly       | [Figshare Metadata](https://figshare.com/)                                                    | _platform metadata_                                                                                                                                            | [Yes](https://codemeta.github.io/crosswalk/figshare/ 'Figshare')                                                        |
| Scholarly       | [Software Discovery Index](https://discoveryindex.org/)                                       | _no public format spec_                                                                                                                                        | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Software Discovery Index')                           |
| Bioinformatics  | [Software Ontology](https://theswo.sourceforge.net/)                                          | [`*.owl`, `*.rdf`](https://www.ebi.ac.uk/ols/ontologies/swo)                                                                                                   | [Yes](https://codemeta.github.io/crosswalk/swo/ 'Software Ontology')                                                    |
| Scholarly       | [Trove Software Map](https://trove.nla.gov.au/)                                               | _portal metadata_                                                                                                                                              | [Yes](https://codemeta.github.io/crosswalk/trove/ 'Trove Software Map')                                                 |
| Scholarly       | [VIVO](https://vivoweb.org/)                                                                  | [`*.rdf`](https://vivoweb.org/ontology)                                                                                                                        | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'VIVO')                                               |
| Scholarly       | [Zenodo Metadata](https://zenodo.org/)                                                        | [`*.zenodo.json`](https://zenodo.org/api/doc)                                                                                                                  | [Yes](https://codemeta.github.io/crosswalk/zenodo/ 'Zenodo')                                                            |
| Space Physics   | [SPASE](https://www.spase-group.org/)                                                         | [`*.xml`](https://www.spase-group.org/data/schema)                                                                                                             | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'SPASE')                                              |

## Crosswalk availability for existing sources

Crosswalk data informs mapping to the `crosswalk` output template:

| Ecosystem  | Organization                                                                            | Metascope Key     | Source Specifications                                                                      | CodeMeta Crosswalk                                                                   |
| ---------- | --------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Agnostic   | [CodeMeta (v1)](https://codemeta.github.io/)                                            | `codemetaJson`    | [`codemeta.json`](https://raw.githubusercontent.com/codemeta/codemeta/1.0/codemeta.jsonld) | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'codemeta-V1')     |
| Agnostic   | [CodeMeta (v2)](https://codemeta.github.io/)                                            | `codemetaJson`    | [`codemeta.json`](https://raw.githubusercontent.com/codemeta/codemeta/2.0/codemeta.jsonld) | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'codemeta-V2')     |
| Agnostic   | [Public Code](https://publiccode.net/)                                                  | `publiccodeYaml`  | [`publiccode.yml`](https://yml.publiccode.tools/schema.core.html) (Also matches `.yaml`)   | [Yes](https://codemeta.github.io/crosswalk/publiccode/ 'publiccode')                 |
| Java       | [Maven](https://search.maven.org/)                                                      | `javaPomXml`      | [`pom.xml`](https://maven.apache.org/pom.html)                                             | [Yes](https://codemeta.github.io/crosswalk/java/ 'Java (Maven)')                     |
| JavaScript | [NPM](https://www.npmjs.com/)                                                           | `nodePackageJson` | [`package.json`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)              | [Yes](https://codemeta.github.io/crosswalk/node/ 'NodeJS')                           |
| Python     | [PyPi (Distutils)](https://pypi.org/)                                                   | `pythonSetupCfg`  | [`setup.cfg`](https://docs.python.org/3/distutils/apiref.html#distutils.config)            | [Yes](https://codemeta.github.io/crosswalk/python/ 'Python Distutils (PyPI)')        |
| Python     | [PyPi (Distutils)](https://pypi.org/)                                                   | `pythonSetupPy`   | [`setup.py`](https://docs.python.org/3/distutils/setupscript.html)                         | [Yes](https://codemeta.github.io/crosswalk/python/ 'Python Distutils (PyPI)')        |
| Python     | [PyPi (PKG-INFO)](https://pypi.org/)                                                    | `pythonPkgInfo`   | [`.egg-info/PKG-INFO`](https://packaging.python.org/en/latest/specifications/)             | [Yes](https://github.com/codemeta/codemeta/blob/3.1/crosswalk.csv 'Python PKG-INFO') |
| Ruby       | [Ruby Gems](https://rubygems.org/)                                                      | `rubyGemspec`     | [`*.gemspec`](https://guides.rubygems.org/specification-reference/)                        | [Yes](https://codemeta.github.io/crosswalk/ruby/ 'Ruby Gem')                         |
| Rust       | [Crates](https://crates.io/)                                                            | `rustCargoToml`   | [`Cargo.toml`](https://doc.rust-lang.org/cargo/reference/manifest.html)                    | [Yes](https://codemeta.github.io/crosswalk/cargo/ 'Rust Package Manager')            |
| Agnostic   | [GitHub Repository Metadata](https://docs.github.com/rest/repos/repos#get-a-repository) | `github`          | _GitHub GraphQL metadata_                                                                  | [Yes](https://codemeta.github.io/crosswalk/github/ 'GitHub')                         |

## Shorter context keys

Maybe, but prefer specificity / preservation of origin...

```txt
arduinoLibraryProperties → arduinoLibrary
cinderCinderblockXml → cinderCinderblock
codemetaJson → codemeta
codeStats → codeStats
dependencyUpdates → dependencyUpdates
fileStats → fileStats
gitConfig → git
github → github
gitStats → gitStats
goGoMod → goGoMod
goGoreleaserYaml → goGoreleaser
javaPomXml → javaPom
licenseFile → license
metadataFile → metadata
nodeNpmRegistry → nodeNpm
nodePackageJson → nodePackage
obsidianPluginManifestJson → obsidianPluginManifest
obsidianPluginRegistry → obsidianPlugin
openframeworksAddonConfigMk → openframeworksAddonConfig
openframeworksInstallXml → openframeworksInstall
processingLibraryProperties → processingLibrary
processingSketchProperties → processingSketch
publiccodeYaml → publiccode
pythonPkgInfo → pythonPkgInfo
pythonPypiRegistry → pythonPypi
pythonPyprojectToml → pythonPyproject
pythonSetupCfg → pythonSetupCfg
pythonSetupPy → pythonSetupPy
readmeFile → readme
rubyGemspec → rubyGemspec
rustCargoToml → rustCargo
xcodeInfoPlist → xcodeInfo
xcodeProjectPbxproj → xcodeProject
```
