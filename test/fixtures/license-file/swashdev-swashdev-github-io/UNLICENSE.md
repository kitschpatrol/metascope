---
layout: default
title: Unlicense Backup
permalink: /unlicense/
---

The Unlicense
=============

This page exists to serve as a backup of the [Unlicense][Unlicense]
homepage.  The backup is not complete, as some information which is not
strictly necessary has been left out.

This backup is not intended as a replacement for the original homepage
_per se_, but rather to provide an extra place where it may be found should
the Unlicense website go offline, and in particular a place where _I_ might
link to it, just in case.

The need for this has already come up at least once, when I went to go
find some of the supplemental materials linked to the Unlicense and the
site had gone offline.  I believe this was due to a temporary lapse on the
owner's part, and it was reconciled quickly enough, but nevertheless it
spurred me to create this backup just in case.

<span class = "important">Needless to say, I am not affiliated with the
creators of the Unlicense, and nor am I a lawyer.  This page is not presenting
legal advice.</span>

<span class = "important">It should be noted that the Unlicense website was
placed under the <a href = "/CC0/">Creative Commons Zero or <q>CC0</q></a>
license by the author, and that this was made known at the bottom of the
<a href = "https://unlicense.org/">original website</a>.</span>

You can download a plaintext copy of the Unlicense [here][textfile].

[Unlicense]: https://unlicense.org/
[textfile]: /files/UNLICENSE.txt
[waiver]: /files/WAIVER.txt
[cc0]: /CC0/

<a id="text" href="#text">Link to text</a>.

Unlicense Yourself: Set Your Code Free
======================================

What is the Unlicense?
----------------------

The Unlicense is a template for [disclaiming copyright monopoly
interest][crypto-publicdomain] in software you've written; in other words, it
is a template for dedicating your software to the [public
domain][stpeter-publicdomain].  It combines a copyright waiver
[patterned][arto-the-unlicense] after the [very successful][sqlite-famous]
public domain [SQLite][sqlite] project with the no-warranty statement from
the widely-used [MIT/X11 license][x11-license].

Why Use the Unlicense?
----------------------

Because you have more important things to do than enriching lawyers or
imposing petty restrictions on users of your code. How often have you passed
up on utilizing and contributing to a great software library just because its
[open source][open-source] license was not compatible with your
own preferred [flavor][open-source-flavor] of open source? How many precious
hours of your life have you spent deliberating how to license your software or
worrying about licensing compatibility with other software? You will never get
those hours back, but here's your chance to start cutting your losses. Life's
too short, let's get back to coding.

The Unlicense
-------------

To opt out of the copyright industry's game altogether and set your code free,
put your next software project into the [public domain][stpeter-publicdomain]
using the following (un)licensing statement:

<pre>This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/></pre>

In a saner world, you would only need the first one or two paragraphs. For the
time being you'll probably [want to retain][arto-the-unlicense] the whole
shebang. (You should feel free, though, to leave out the last line containing
the link to this site, if that's your preference.)

You would traditionally put the above statement into a file named COPYING or
LICENSE. However, to explicitly distance yourself from the whole concept of
copyright licensing, we recommend that you put your unlicensing statement in a
file named [UNLICENSE][textfile]. Doing so also means that your project can
more easily be found on e.g. [GitHub][gh-search] or
[Bitbucket][google-search-bb], enabling others to reuse your code in their own
unencumbered public domain projects.

For a comprehensive listing of software using the Unlicense, [google for the
first line of the Unlicense][google-search]. It was purposely worded uniquely,
which means that all the returned search results are likely to relate to the
Unlicense in some way.

Unlicensing Contributions
-------------------------

In order to ensure your project remains completely free and unencumbered by
anyone's copyright monopoly, it is advisable that you ask any major
contributors to explicitly dedicate their code-base contributions to the public
domain.

This removes any possible ambiguity as to what terms somebody might have
thought they were contributing under, in case of a future dispute. These
concerns are not unique to public domain software. Most large, established
open-source projects have a Contributor License Agreement ([CLA][cla]) process,
of varying degrees of formality.

At minimum, you might ask your contributors to accompany any
[non-trivial][gnu-nontrivial] patches with a simple statement like the
following:

<pre>I dedicate any and all copyright interest in this software to the
public domain. I make this dedication for the benefit of the public at
large and to the detriment of my heirs and successors. I intend this
dedication to be an overt act of relinquishment in perpetuity of all
present and future rights to this software under copyright law.</pre>

Better yet is to ask the major contributors to
[digitally sign][digital-signature] a more explicit copyright release (see an
example [WAIVER][waiver] file), and then to keep a record of such signatures in
an AUTHORS file accompanying your software. Using [GnuPG][gnupg], contributors
can sign a copyright waiver file as follows:

<pre>$ gpg --no-version --armor --sign WAIVER</pre>

Note that if a contributor makes significant changes or enhancements in his
capacity as an employee of some formal organization, then the above may be
insufficient and you would additionally need to ask for a copyright disclaimer
signed by a company officer. For more information, have a look at [how the
SQLite project handles this][sqlite-license]. The Free Software Foundation
(FSF) also [provides an example][nonfree-example] of a simple copyright
disclaimer to be signed by an employer.

For a concrete example of this contributor process, see [how the unlicensed
RDF.rb project has handled this][free-example].

[crypto-publicdomain]: http://cr.yp.to/publicdomain.html
[stpeter-publicdomain]: http://stpeter.im/writings/essays/publicdomain.html
[arto-the-unlicense]: http://ar.to/2010/01/dissecting-the-unlicense
[sqlite-famous]: http://www.sqlite.org/famous.html
[sqlite]: http://www.sqlite.org/
[sqlite-license]: http://www.sqlite.org/copyright.html
[x11-license]: https://en.wikipedia.org/wiki/MIT_License
[open-source]: http://www.opensource.org/
[open-source-flavor]: http://www.opensource.org/licenses/alphabetical
[gh-search]: https://github.com/search?q=path%3AUNLICENSE&type=Code&s=indexed
[google-search-bb]: https://www.google.com/search?q=%22This+is+free+and+unencumbered+software+released+into+the+public+domain%22+site%3Abitbucket.org&filter=0
[google-search]: https://www.google.com/search?q=%22This+is+free+and+unencumbered+software+released+into+the+public+domain%22&filter=0
[cla]: https://en.wikipedia.org/wiki/Contributor_License_Agreement
[gnu-nontrivial]: http://www.gnu.org/prep/maintain/maintain.html#Legally-Significant
[digital-signature]: https://en.wikipedia.org/wiki/Digital_signature
[gnupg]: http://www.gnupg.org/
[nonfree-example]: http://www.fsf.org/licensing/licenses/gpl-howto.html
[free-example]: http://lists.w3.org/Archives/Public/public-rdf-ruby/2010May/0013.html
