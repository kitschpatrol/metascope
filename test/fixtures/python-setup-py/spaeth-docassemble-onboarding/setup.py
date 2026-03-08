import os
import sys
from setuptools import setup, find_packages
from fnmatch import fnmatchcase
from distutils.util import convert_path

standard_exclude = ('*.pyc', '*~', '.*', '*.bak', '*.swp*')
standard_exclude_directories = ('.*', 'CVS', '_darcs', './build', './dist', 'EGG-INFO', '*.egg-info')
def find_package_data(where='.', package='', exclude=standard_exclude, exclude_directories=standard_exclude_directories):
    out = {}
    stack = [(convert_path(where), '', package)]
    while stack:
        where, prefix, package = stack.pop(0)
        for name in os.listdir(where):
            fn = os.path.join(where, name)
            if os.path.isdir(fn):
                bad_name = False
                for pattern in exclude_directories:
                    if (fnmatchcase(name, pattern)
                        or fn.lower() == pattern.lower()):
                        bad_name = True
                        break
                if bad_name:
                    continue
                if os.path.isfile(os.path.join(fn, '__init__.py')):
                    if not package:
                        new_package = name
                    else:
                        new_package = package + '.' + name
                        stack.append((fn, '', new_package))
                else:
                    stack.append((fn, prefix + name + '/', package))
            else:
                bad_name = False
                for pattern in exclude:
                    if (fnmatchcase(name, pattern)
                        or fn.lower() == pattern.lower()):
                        bad_name = True
                        break
                if bad_name:
                    continue
                out.setdefault(package, []).append(prefix+name)
    return out

setup(name='docassemble.onboarding',
      version='0.0.7',
      description=('An Interview with docassemble for on-boarding employees'),
      long_description='#on-boarding.tax-bot\r\nThis ist an interview with docassemble for on-boarding employees in client-companies. \r\n0.0.7:\r\n- messages improved\r\n\r\n0.0.6:\r\n- implemeted SMS and E-Mail Feature\r\n- multiple language templates\r\n\r\n0.0.5:\r\n- added settings\r\n- json attachement\r\n\r\n0.0.4:\r\n- div. verbesserungen\r\n- Stand Übergabe an Laura - Rückgabe an Thomas Ausgabe in PDF Personalfragebogeformular möglich\r\n\r\n0.0.2: \r\n- RV/PV/etc. removed\r\n- Insurance Combobox implemented\r\n- RV Option in Minijob inserted\r\n\r\n# TODOs:\r\n\r\nhttps://kanzleispaeth-my.sharepoint.com/:x:/g/personal/thomas_spaeth_kanzlei-spaeth_de/ETohst0E18xBmOgw0BgQPq8BHasdEzsAghDmYscC6p4rqQ\r\n\r\n## Automatisierung\r\n- Warum kein Autofill mehr bei Straße und CO?\r\n\r\nValidierung\r\n- Sozialverslicherungsnummer\r\n- Einstieg<Ausstiegsdatum\r\n- IBAN\r\n\r\nFelder\r\n- Datumfeld Einstieg\r\n- Jahr als erste Wahl\r\n- Tätigkeiten automatisch lernen und zur Bearbeitung in Profilseite\r\n- Sachbearbeiter in Profilseite\r\n- Exportmuster in Textfeld vorgeben\r\n- Krankenversicherung Vorschlagsliste\r\n\r\nHilfe\r\n- Hilfe unterschiedlich für Mandant und Mitarbeiter des Mandanten\r\n- Videos Einfahrung und erläuterung\r\n- Fachbegriffe erläutern\r\n- SPAM-Filter Hinweis für Mandanten\r\n\r\nDokumente\r\n- Mitteilungen in E-Mail an prominenter Stelle\r\n- Mehrsprachige E-Mail eingestellte Spache + englisch\r\n- Mehrsprachiges (romämisch und englische) Beschreibung zum drucken\r\n\r\nDokumentation\r\n  - Einzelnen Felder Erläutern\r\n\r\nAblauf\r\n  - Pflichtfelder einfordern von Unternhemen\r\n  - Kontrolle von Untemrnehmen einführen\r\n  - Arbeitsvertrag automatisieren, durch erste Eingaben, das Template je Mandant\r\n  - Beschäftigungen Zeit bei kurzfristiger Beschäftigung\r\n\r\nUser\r\n  - Untemrnehmensprofil an Nummer und PW koppeln\r\n  - später IDM \r\n  - (Mandanten) Benutzer über IDM anlegen\r\n\r\n\r\n',
      long_description_content_type='text/markdown',
      author='Thomas Späth',
      author_email='thomas.spaeth@kanzlei-spaeth.de',
      license='The MIT License (MIT)',
      url='https://kanzlei-spaeth.de',
      packages=find_packages(),
      namespace_packages=['docassemble'],
      install_requires=['qrcode>=6.1'],
      zip_safe=False,
      package_data=find_package_data(where='docassemble/onboarding/', package='docassemble.onboarding'),
     )

